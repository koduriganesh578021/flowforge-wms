# Priority Policy Review — FlowForge WMS

Proposed policy under review:

| Signal | Points |
|---|---:|
| Same-Day shipping | +40 |
| Express shipping | +25 |
| VIP customer | +25 |
| Business customer | +10 |
| Due within 2 hours | +30 |
| Due within 8 hours | +15 |
| High value order | +10 |
| Predicted dispatch risk | +20 |

---

## 1. Are the score ranges sensible?

Not quite, because of a hidden ceiling problem. Walk through the realistic maximum, assuming shipping type, customer tier, and deadline window are each *mutually exclusive categories* (an order has one shipping type, one tier, one deadline bucket):

```
Same-Day (40) + VIP (25) + Due within 2h (30) + High value (10) + Dispatch risk (20) = 125
```

That's already above a clean 0–100 scale, and it's before asking whether the buckets *should* be exclusive (see §2 — they currently aren't, which pushes the true ceiling to 175 if everything stacks).

Two fixes — pick one:

- **Cap the raw score at 100** (`score = min(raw_score, 100)`), keep everything else additive. Simple, preserves the "out of 100" mental model for judges.
- **Rebalance point values** so the mutually-exclusive-category max naturally lands near 100 (e.g., Same-Day 35, VIP 20, Due-within-2h 25, high value 10, dispatch risk 10 → max 100). More elegant, more retuning work.

For a hackathon: cap rather than rebalance — less risk of breaking demo numbers the night before.

---

## 2. Avoiding double-counting deadline risk

This is the real issue. Three signals can all fire from the same underlying fact (the order is due soon):

- **Same-Day shipping** (+40) — a same-day order is *definitionally* due soon
- **Due within 2/8 hours** (+30/+15) — directly measures time-to-deadline
- **Predicted dispatch risk** (+20) — if computed from capacity-vs-deadline math, it's a fourth restatement of the same fact

If all three fire on one order, the score isn't measuring "how urgent is this" — it's measuring "how many ways can I describe urgency," which inflates Same-Day + imminent orders far past anything else and makes the score hard to explain in the demo ("why is this +90 and not +55?").

**Fix (combine both):**

- **Treat deadline-urgency as one group, take the max, not the sum.** Same-Day shipping and the due-within-2h/8h buckets are one signal (time pressure), not two: `urgency = max(same_day_points, due_2h_points, due_8h_points)`.
- **Define "predicted dispatch risk" as orthogonal to the deadline**, not a re-derivation of it. If the dispatch-risk logic internally just checks "will this miss its due_at," it's redundant with the urgency group by construction. Give it a distinct, independently falsifiable meaning — e.g. *packing queue depth exceeds capacity for the remaining window*, or *SKU has no verified-confidence stock*. If the rule can't be stated in one sentence that doesn't mention `due_at`, it shouldn't be a separate scoring signal — fold it into urgency instead.

---

## 3. Threshold suggestion (with the 100-point cap applied)

| Score | Label |
|---:|---|
| ≥ 80 | Critical |
| 55–79 | High |
| 30–54 | Medium |
| < 30 | Normal |

Rationale: with the urgency group capped via `max()` rather than summed, a realistic strong order looks like `VIP(25) + Express(25) + due-2h(30) + high-value(10) = 90` → comfortably Critical, while a routine order with one weak signal (`Business(10)`) stays well inside Normal. Leaves headroom so dispatch-risk matters without a single order guaranteeing max score on its own.

---

## 4. Edge cases to test/handle explicitly

- **Same-Day + due-within-2h firing together** — must resolve to one urgency contribution, not two.
- **Overdue order** (`due_at` in the past) — scoring it identically to "due in 90 minutes" hides that it's already breached. Separate the *priority score* (used for allocation ordering) from a *risk_status* flag that's independently `Blocked` regardless of score.
- **Missing `due_at`, `shipping_type`, `customer_tier`, or `order_value`** — must default to zero contribution without throwing, but shouldn't silently look identical to a genuinely low-priority order. Add a `data_incomplete` reason string so it's visible in the explanation drawer.
- **Both VIP and Business somehow set** (bad seed data) — tier should be mutually exclusive; take the higher value, don't sum.
- **`predicted dispatch risk` with no defined trigger** — the one rule in the list without a concrete condition attached. Write the one-sentence rule (see §2) before coding it, or it becomes a black box that undermines the "explainable" pitch to judges.
- **Score ties** — with capping/max-groups, ties will happen (two Critical orders at 80). Allocation needs a deterministic tiebreaker (e.g. earlier `due_at`, then earlier `created_at`, then order ID) so re-running the same seed data always produces the same demo outcome.
- **Boundary scores exactly at a threshold** (79 vs 80, 54 vs 55) — needs explicit test coverage so label edges are provably correct.

---

## 5. Four unit-test scenarios

1. **Urgency de-duplication** — Same-Day shipping + due in 90 minutes + VIP + high value. Assert the urgency group contributes only its max value (not Same-Day's 40 *plus* the 2h bucket's 30), and the final score matches the capped/rebalanced expectation exactly.
2. **Dispatch risk independent of deadline** — order due in 24 hours (no same-day/express, outside both deadline buckets), but `predicted dispatch risk` is true for a reason unrelated to time (e.g. packing backlog). Assert the risk points still apply and aren't zeroed out by the "far from deadline" state — proves the two signals are actually decoupled.
3. **Missing/incomplete data doesn't crash and doesn't over- or under-score** — order with `due_at=None`, `shipping_type=None`, `order_value=None`. Assert score is a clean baseline, `risk_status` is `Unknown` rather than `Safe`, and a reason string flags the missing data rather than raising.
4. **Threshold boundary + overdue distinction** — two orders: one scoring exactly 80 (must be Critical) and one at 79 (must be High), plus a third order already overdue by 3 hours but otherwise low-scoring — assert its `risk_status` is `Blocked`/escalate-worthy even though its priority *score* alone wouldn't put it in Critical, proving queue-ordering and breach-state don't get conflated.