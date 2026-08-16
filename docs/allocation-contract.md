# Allocation Contract Review — FlowForge WMS

Scope: this reviews the allocation contract only. No framework or database code — pure
specification, so it can be implemented against any ORM/router without rework.

Three points in the given spec are underspecified and I've made an explicit default
choice for each, flagged inline as **[POLICY DECISION]**. Confirm or override before
implementation.

---

## 1. Invariants

### Pre-conditions (must hold before an allocation run touches any row)

- For every `Inventory` row: `on_hand - allocated - damaged >= 0` (sanity check on
  existing data; if violated, the run should flag data corruption rather than allocate
  against it).
- For every `OrderItem`: `quantity_requested >= quantity_allocated >= quantity_picked
  >= quantity_dispatched >= 0` — the monotonic chain must already hold. Allocation
  never has to "fix" a broken chain, only extend it.
- Only `Order.status` in `{Created, Prioritized, Awaiting Allocation, Partially
  Allocated, Allocated}` is considered. Anything else (Picked, Packed, QC, Ready to
  Dispatch, Dispatched) is read-only input, never a mutation target.

### Post-conditions (must hold after a run completes, for every row it touched)

- **Monotonic, capped growth per line:** `quantity_allocated_after = quantity_allocated_before + newly_allocated_this_run`, and `quantity_allocated_after <= quantity_requested` always. Never decreases.
- **Non-negative availability:** for every `Inventory` row touched, `allocated_after <= on_hand - damaged`, i.e. `available_after >= 0`. This must hold even mid-run, not just at the end — a bin can never go negative even transiently.
- **Conservation of units:** for a given SKU, `sum(newly_allocated_this_run across all OrderItem lines) == sum(newly_allocated_this_run across all Inventory rows)`. No units are created or destroyed by allocation.
- **Protected-state immutability:** any `Inventory.allocated` or `OrderItem.quantity_allocated` tied to an order in `{Picked, Packed, QC, Ready to Dispatch, Dispatched}` is untouched by the run — not read as a reallocation source, not decremented, not incremented.
- **No silent reallocation:** if a higher-priority order's shortage could be covered by taking stock from a lower-priority `Created`/`Allocated` order, no `Inventory` or `OrderItem` row for either order is mutated. Instead, exactly one `Decision` (type `REALLOCATION_APPROVAL_REQUIRED`, status `Pending Approval`) is created per `{sku, from_order, to_order}` triple, and stock stays exactly where it was.
- **Quarantine exclusion:** any bin with `verification_status == "Quarantined"` contributes `0` to available stock regardless of what `on_hand - allocated - damaged` computes to. This is a hard exclusion, not a preference.
- **Idempotency:** re-running the allocation process against unchanged `Inventory`/`Order` state produces zero additional mutations — no line's `quantity_allocated` increases, no bin's `allocated` changes, no duplicate `Decision` is created for a `{sku, from_order, to_order}` triple that already has one pending.

---

## 2. Expected result shape

```text
AllocationRunResult
├── run_id
├── timestamp
├── orders: [ OrderAllocationResult ]
├── unresolved_shortages: [ ShortageRecommendation ]
└── decisions_created: [ DecisionRef ]

OrderAllocationResult
├── order_id
├── previous_status
├── new_status
├── explanation                     — order-level reason for the status transition
└── lines: [ LineAllocationResult ]

LineAllocationResult
├── order_item_id
├── sku_id
├── quantity_requested
├── quantity_allocated_before
├── quantity_allocated_after
├── quantity_newly_allocated        — delta this run; 0 on a no-op re-run
├── quantity_unfulfilled            — requested - allocated_after
├── line_status                     — Fulfilled | Partially Allocated | Unallocated
├── source_bins: [
│     { location_id, location_code, quantity_taken,
│       verification_status, confidence_score }
│   ]
└── explanation                     — which bins were used, in what order, why

ShortageRecommendation              — one per SKU with residual unmet demand
├── sku_id
├── total_unfulfilled_across_orders
├── affected_order_ids
├── suggested_reorder_quantity      — optional, hands off to reorder engine
└── explanation

DecisionRef                         — one per reallocation candidate found, not auto-applied
├── decision_id
├── type: "REALLOCATION_APPROVAL_REQUIRED"
├── sku_id
├── from_order_id                   — lower-priority order currently holding the stock
├── to_order_id                     — higher-priority order that would benefit
├── quantity_candidate
├── status: "Pending Approval"
└── explanation
```

**[POLICY DECISION — order-level status transition]** The spec doesn't state exactly
when `Order.status` moves between `Awaiting Allocation` / `Partially Allocated` /
`Allocated`. Recommended default:

- `Allocated` — every line's `quantity_allocated == quantity_requested`.
- `Partially Allocated` — at least one line has `0 < quantity_allocated < quantity_requested`, OR the order has a mix of fully-fulfilled and unfulfilled lines.
- Unchanged from its prior status — if this run allocated nothing new at all across every line (covers the zero-stock and repeated-call cases; the order isn't regressed to a worse-sounding state just because a run found no stock).

---

## 3. Behavior for the seven edge cases

**1. Zero stock** — `available == 0` for the SKU and no eligible lower-priority order
holds reallocatable stock. No mutation. Every requesting line stays at its prior
`quantity_allocated` (0 if nothing was ever allocated), `line_status = "Unallocated"`.
Order status is left unchanged (not regressed). One `ShortageRecommendation` is
emitted per SKU. No `Decision` is created — there's nothing to reallocate from.
*(If zero stock is available but a lower-priority order **is** holding stock, that's
case 8/9 in the test list below, not this case — it becomes a `Decision`, not a
plain shortage.)*

**2. Equal priority** — tie-break by `due_at` ascending, then `created_at` ascending,
per the spec. **[POLICY DECISION]** if both are also equal, the spec has no further
tiebreaker; add `order_id` ascending as a final deterministic fallback, or repeated
runs against tied seed data can produce different demo results on different days.
No proportional splitting between tied orders — the fully resolved sort order is
processed strictly in sequence, first order gets stock first up to availability.

**3. Multi-bin stock** — a single line may draw from several bins if one bin can't
cover the full request. Bin selection order: exclude Quarantined entirely, then
Verified before Needs Count, then higher `confidence_score`, then `location_code`
ascending. Each bin's contribution is recorded separately in `source_bins`. Bins are
decremented as they're consumed within the run, so a later line in the same run sees
the reduced remainder, not the original snapshot.

**4. Low-confidence-only stock** — only `Needs Count` bins have availability; no
`Verified` bin has any. **[POLICY DECISION]** the spec's "prefer Verified" rule is a
preference, not a hard block — only Quarantined is a hard exclusion — so the
recommended default is: allocate from the low-confidence bin(s) rather than leaving
the order unfulfilled, but the line's `explanation` must carry an explicit confidence
warning, and the result should include a paired recommendation (a cycle-count task)
alongside the allocation rather than silently reading identical to a full-confidence
allocation. If you'd rather this be `Approval Required` instead of auto-executed,
that's an equally defensible alternate default — pick one now since it changes the
`decision_mode` on the response.

**5. Multi-line order** — each line is allocated independently against its own SKU's
availability; one line's shortage never blocks another line's success. The order's
single `priority_score` governs sort order identically for every line — there is no
per-line re-prioritization. Order-level status is the aggregate of all lines per the
policy decision in §2.

**6. Repeated allocation call** — with no intervening state change, the second call
must be a pure no-op: `quantity_newly_allocated = 0` on every line, no `Inventory`
writes, `explanation` should read as "already allocated," not restate reasoning that
implies new work happened. No duplicate `Decision` for a `{sku, from_order, to_order}`
triple that already has one `Pending Approval`. `ShortageRecommendation` entries may
be re-emitted as informational (the shortage still exists) but must not double-count
against a total that was already reported.

**7. Partially allocated order** — only the delta is allocated:
`min(quantity_requested - quantity_allocated_before, available)`.
`quantity_allocated_before` is a floor the engine never decreases. Result must show
`quantity_allocated_before` and `_after` distinctly so the delta reads clearly in the
explanation. Status moves `Partially Allocated → Allocated` only if this run
completes every line; otherwise it stays `Partially Allocated`.

---

## 4. Unit test cases with expected results

1. **Zero stock, single order.** SKU-A: on_hand=0 → available=0. One order requests 5.
   *Expected:* no mutation; `quantity_allocated` stays 0; `line_status="Unallocated"`;
   order status unchanged; one `ShortageRecommendation` for SKU-A, unfulfilled=5; no
   `Decision`.

2. **Equal priority, tie-break by due_at.** SKU-B available=5. Order X
   (`priority_score=70`, `due_at=T+2h`) requests 5; Order Y (`priority_score=70`,
   `due_at=T+5h`) requests 5. *Expected:* Order X allocated first (same score,
   earlier due date) → 5/5, `Allocated`. Order Y gets 0, stays unfulfilled;
   `ShortageRecommendation` for SKU-B, unfulfilled=5 (Order Y's demand).

3. **Multi-bin fulfillment for one line.** SKU-C: Bin-1 Verified, confidence=95,
   available=3; Bin-2 Verified, confidence=80, available=4. Order requests 6.
   *Expected:* 3 taken from Bin-1 (higher confidence first), 3 from Bin-2 → 6/6,
   `Fulfilled`; `source_bins` lists both; Bin-2 retains 1 unit available for other
   orders after the run.

4. **Low-confidence-only stock.** SKU-D: Bin-1 Verified available=0; Bin-2
   `Needs Count`, confidence=40, available=5 (not Quarantined). Order requests 5.
   *Expected (per §3 policy default):* 5/5 allocated from Bin-2; `line_status`
   fulfilled but flagged with a confidence warning in `explanation`; response
   includes a companion cycle-count recommendation.

5. **Multi-line order, one SKU short.** Order has SKU-E (requests 4, available=4) and
   SKU-F (requests 3, available=1). *Expected:* SKU-E line 4/4 `Fulfilled`; SKU-F
   line 1/3 `Partially Allocated`, unfulfilled=2; order-level status
   `Partially Allocated`; `ShortageRecommendation` emitted for SKU-F only.

6. **Repeated allocation call, no state change.** Run once (fully allocated), then
   run again immediately. *Expected second run:* zero mutations;
   `quantity_newly_allocated=0` on every line; explanation indicates already-fulfilled;
   no new `Decision`; no duplicate `ShortageRecommendation` count.

7. **Partially allocated order, replenished stock.** Order previously allocated 2 of 5
   requested (prior run left available=0). New stock arrives, available=10 now.
   *Expected:* `remaining_required = 5-2 = 3`; allocate `min(3,10)=3`;
   `quantity_allocated_before=2`, `_after=5`, `newly_allocated=3`; status
   `Partially Allocated → Allocated`; `Inventory.allocated` increases by 3 only, not 5.

8. **Reallocation candidate creates a Decision, not a mutation.** SKU-G: available=0,
   but 3 units are `allocated` to Order-Low (`priority_score=20`, status=`Created`,
   not yet picked). Order-High (`priority_score=95`, status=`Prioritized`) requests 3
   units, no other stock exists. *Expected:* no stock moves; Order-High's line stays
   0/3 `Unallocated`; Order-Low's allocation is untouched; one `Decision`
   (`REALLOCATION_APPROVAL_REQUIRED`, from=Order-Low, to=Order-High, sku=SKU-G,
   quantity_candidate=3, status=`Pending Approval`) is created;
   `ShortageRecommendation` for Order-High's unmet 3 units is also emitted.

9. **Protected order states are never a reallocation source.** SKU-H: available=0,
   but 5 units are `allocated`+`picked` against Order-Packed (status=`Packed`).
   Order-New (`priority_score=90`) requests 5, no other stock exists. *Expected:* no
   `Decision` is created against Order-Packed (protected status is a hard exclusion,
   not an approval-gated one); no mutation; Order-New stays `Unallocated`;
   `ShortageRecommendation` emitted, with explanation noting the 5 units are held by
   an order already past the allocation-eligible states.

10. **Quarantined inventory is excluded regardless of the raw numbers.** SKU-I:
    Bin-1 `verification_status="Quarantined"`, `on_hand=10, allocated=0, damaged=0`
    (raw formula would read available=10). Bin-2 has 0. Order requests 4.
    *Expected:* available is treated as 0 despite the raw arithmetic; line stays
    `Unallocated`; `ShortageRecommendation` emitted; explanation explicitly notes the
    quarantine exclusion so it doesn't read as a bug when the raw `Inventory` row
    shows non-zero `on_hand`.