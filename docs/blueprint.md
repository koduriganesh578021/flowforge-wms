# Warehouse Decision Operations Platform

## Product Blueprint and Hackathon Build Plan

## 1. Executive Summary

### Product purpose

Build a smart warehouse operations and order-fulfillment platform that manages the complete path from a newly created order to dispatch. The platform is not a simple inventory dashboard or CRUD application. It is an **explainable warehouse decision operating system** that continuously answers:

- What should happen next?
- Why is that action recommended?
- Which order, stock item, or warehouse stage is at risk?
- When can the system act automatically, when should it request approval, and when must it escalate to a manager?

### Core problem

Warehouses process many SKUs, bins, workers, and customer orders simultaneously. Common failures include poor stock visibility, inventory records that do not match physical bins, incorrect allocation of scarce stock, delayed picking, damaged or missing inventory, packing queues, and late dispatches. These cause stockouts, failed customer promises, rework, delayed shipments, and unhappy customers.

### Core solution

Use live operational state (seeded/mock starting data in the hackathon) plus reusable, policy-based rules to calculate decisions dynamically. The system must not hardcode responses for a named demo order. It should process any valid SKU, order, bin, quantity, deadline, and event using the same decision engine.

```text
Live orders + inventory + warehouse events
→ classify event
→ apply configured policy/rules
→ calculate decision
→ explain rationale
→ update inventory/workflow
→ auto-execute, request approval, or escalate
```

### Positioning

> **An explainable decision layer for warehouse fulfillment operations.**
> It prioritizes orders, allocates scarce inventory safely, handles exceptions, and identifies operational bottlenecks before they become late shipments.

Suggested product name: **FlowForge WMS**

Suggested tagline: **Explainable fulfillment decisions for high-velocity warehouses.**

---

## 2. Hackathon Requirement Coverage

The hackathon expects this flow:

```text
Order Created
→ Priority Determined
→ Inventory Checked
→ Stock Allocated
→ Picking
→ Packing
→ Quality Check
→ Dispatch
→ Inventory Updated
```

It also explicitly requires:

```text
Exception → Decision → Resolution
```

The platform covers every expected workflow.

| Hackathon requirement | FlowForge capability |
|---|---|
| Inventory & stock monitoring | SKU, bin/location, on-hand, allocated, damaged, available stock, movement history, risk alerts |
| Order management & prioritization | Order records, SLA/tier/deadline-based priority scoring, queue ordering, at-risk badges |
| Inventory allocation | Priority-first allocation, partial allocation, reservation protection, backorders, reorder suggestions |
| Picking & packing management | Pick tasks by bin, pick sequence, exception reporting, packing verification |
| Low/out-of-stock detection | Reorder threshold, projected stock risk from pending demand, recommendation cards |
| Damaged/missing item handling | Quarantine, discrepancy task, alternate-bin recovery, replacement pick, escalation |
| Fulfillment and dispatch tracking | Order status transitions, mock carrier/tracking, timestamps, inventory updates |
| Analytics and bottlenecks | Queue, wait time, throughput, exception rate, bottleneck alerts and actions |
| Decision making | Explainable rules, recommendations, approvals, escalation modes |

---

## 3. The Product Architecture

### Three layers

```text
Layer 1 — Product UI
Command Center · Orders · Inventory · Picking/Fulfillment · Exceptions/Decision Center

Layer 2 — Decision Engine
Priority · Allocation · Reorder · Exceptions · Inventory Confidence · Bottlenecks · Status validation

Layer 3 — Data and Events
Products/SKUs · Bins · Inventory · Orders · Order items · Pick tasks · Events · Decisions · Audit logs
```

### Recommended technical stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast UI iteration and polished dashboard screens |
| Charts | Recharts | Lightweight KPI and bottleneck visualizations |
| Backend | Python FastAPI | Strong fit for rule-engine logic, fast APIs, automatic Swagger docs |
| Database | SQLite + SQLAlchemy | Zero setup, reliable local hackathon database, easy seeded data |
| IDE | VS Code + GitHub Copilot Student | Existing free student access; use for implementation and debugging |
| Deployment | Vercel frontend + Render/Railway backend, with local fallback | Deploy only after the core demo works |

### Core backend modules

```text
backend/
  services/
    priority_engine.py
    allocation_engine.py
    reorder_engine.py
    exception_engine.py
    inventory_confidence_engine.py
    bottleneck_engine.py
    workflow_engine.py
  models/
  routers/
  seed/
  tests/
```

---

## 4. Data Model

### 4.1 Products / SKUs

| Field | Purpose |
|---|---|
| id | Internal identifier |
| sku_code | Human-readable product code, e.g. SCN-101 |
| name | Product name |
| category | Product category |
| reorder_point | Low-stock threshold |
| target_stock | Desired replenishment target, normally 2 × reorder point |
| unit_of_measure | Units, boxes, etc. |

### 4.2 Locations / bins

| Field | Purpose |
|---|---|
| id | Internal location ID |
| warehouse | Warehouse label |
| zone | Zone, e.g. A |
| aisle | Aisle, e.g. 03 |
| rack | Rack, e.g. R2 |
| bin | Bin, e.g. B04 |
| location_code | Full code such as A-03-R2-B04 |

### 4.3 Inventory by SKU and bin

| Field | Purpose |
|---|---|
| sku_id | Product reference |
| location_id | Bin reference |
| on_hand | Physical units recorded in stock |
| allocated | Units reserved for open orders |
| picked | Units picked but not dispatched |
| damaged | Units moved to damaged/quarantine |
| available | Computed: on_hand − allocated − damaged |
| confidence_score | 0–100 confidence in the recorded bin count |
| verification_status | Verified / Needs Count / Quarantined |
| last_verified_at | Last cycle count / verification time |
| discrepancy_count | Count of recent mismatch events |

### 4.4 Orders and order items

Order fields:

| Field | Purpose |
|---|---|
| id | Order ID, e.g. ORD-1042 |
| customer_name | Customer / account label |
| customer_tier | VIP / Business / Standard |
| shipping_type | Same-Day / Express / Standard |
| created_at | Order creation time |
| due_at | Required dispatch/delivery deadline |
| order_value | Value for business-priority logic |
| status | Workflow status |
| priority_score | Computed score |
| priority_label | Critical / High / Medium / Normal |
| risk_status | Safe / At Risk / Blocked / Partial Fulfillment |
| stage_entered_at | Timestamp for wait-time and bottleneck analytics |

Order-item fields:

| Field | Purpose |
|---|---|
| order_id | Parent order |
| sku_id | Requested product |
| quantity_requested | Requested quantity |
| quantity_allocated | Reserved quantity |
| quantity_picked | Pick-confirmed quantity |
| quantity_dispatched | Shipped quantity |
| quantity_unfulfilled | Remaining/backordered quantity |

### 4.5 Pick tasks

| Field | Purpose |
|---|---|
| id | Pick-task ID |
| order_id | Related order |
| sku_id | Item to pick |
| source_location_id | Required bin |
| quantity_required | Units needed |
| quantity_confirmed | Units confirmed picked |
| sequence | Pick-order number |
| status | Pending / In Progress / Picked / Exception |
| assigned_worker | Mock worker assignment |

### 4.6 Events, decisions, and audit logs

Events are structured facts sent into the system.

```json
{
  "event_type": "ITEM_DAMAGED",
  "sku_id": "SKU-301",
  "quantity": 2,
  "location_id": "A-03-R2-B04",
  "order_id": "ORD-1042",
  "reported_by": "picker-12",
  "timestamp": "2026-08-16T10:00:00"
}
```

Store:

- event type
- event payload / relevant references
- timestamp
- resulting decision
- decision mode
- explanation
- user/system actor
- before/after values where practical

---

## 5. Inventory and Stock Monitoring

### Purpose

Give managers a reliable view of stock availability, location, risk, and movement—not just a single quantity field.

### Problem solved

A single `quantity = 50` number is misleading. Some stock may already be reserved for orders, damaged, or physically unreliable. Poor visibility leads to overpromising and failed picks.

### Inventory accounting rule

\[
\text{Available stock} = \text{On-hand stock} - \text{Allocated stock} - \text{Damaged/quarantined stock}
\]

Example:

| SKU | On hand | Allocated | Damaged | Available | Reorder point |
|---|---:|---:|---:|---:|---:|
| Wireless Scanner | 50 | 18 | 2 | 30 | 20 |

### Features

- Product/SKU catalogue.
- Stock shown by warehouse location: Zone → Aisle → Rack → Bin.
- Inventory states: on hand, available, allocated/reserved, picked, damaged/quarantined.
- Reorder point and target stock per SKU.
- Inventory movement history: received, allocated, picked, damaged, returned, dispatched.
- Stock risk cards on the dashboard.

### Smart decision

Instead of only showing “Low Stock,” show the impact and recommended action.

Example:

> **Critical stock risk — SKU: SCN-101**
> Available: 7 units · Reorder point: 15 · Demand from pending orders: 18 units
> **Recommended action:** Reserve the 7 available verified units for the highest-SLA order and create a replenishment recommendation.

### Optional lightweight differentiator: Inventory Confidence

Real warehouse records can disagree with physical bins after short picks, damage, misplaced goods, or delayed cycle counts. Add a simple confidence layer.

Rules:

```text
Do not allocate from Quarantined inventory.
Prefer Verified / high-confidence bins.
If only low-confidence stock remains:
  recommend approval and a cycle-count task before promising full fulfillment.
```

Example:

> **Allocation risk detected — SKU SCN-101**
> 7 units appear available, but 5 are in a low-confidence bin after a recent short-pick event.
> **Recommended action:** Allocate 2 verified units now; create a cycle-count task for the remaining 5.
> **Decision mode:** Approval required.

This is an enhancement. It must not block the core allocation workflow if time is short.

---

## 6. Order Management and Prioritization

### Purpose

Determine which order must be processed first and make the reason visible to warehouse operators.

### Problem solved

Treating every order equally causes SLA-critical or VIP orders to be delayed behind low-impact orders. A warehouse needs a transparent and consistent queue policy.

### Required order information

- Order ID.
- Customer and tier: VIP, Business, Standard.
- Created timestamp and due deadline.
- Shipping type: Same-Day, Express, Standard.
- Order value.
- Requested SKUs and quantities.
- Workflow status.
- Calculated priority and risk status.

### Explainable priority score

Use deterministic rules, not ML.

Example scoring policy:

| Signal | Rule | Points |
|---|---|---:|
| Shipping type | Same-Day | +40 |
| Shipping type | Express | +25 |
| Customer tier | VIP | +25 |
| Customer tier | Business | +10 |
| Deadline | Due within 2 hours | +30 |
| Deadline | Due within 8 hours | +15 |
| Order value | Above ₹20,000 | +10 or +15 |
| Dispatch risk | Predicted late / delayed | +20 |

Suggested labels:

| Score | Label |
|---:|---|
| 80–100 | Critical |
| 60–79 | High |
| 35–59 | Medium |
| Below 35 | Normal |

### Example

> `ORD-1042` is **Critical (90/100)**: VIP customer (+25), Express shipping (+25), due in 90 minutes (+30), high-value order (+10). It moves ahead of standard orders in the fulfillment queue.

### UI requirements

- Orders list with status, priority badge, risk badge, deadline, and allocation result.
- Order-detail page with a “Why this priority?” explanation drawer.
- Ability to create a test order / urgent order from the simulation panel.

---

## 7. Smart Inventory Allocation

### Purpose

Reserve stock for orders before picking, especially when multiple orders compete for limited inventory.

### Problem solved

Without allocation, a system can promise the same inventory to multiple orders. Without priority, scarce stock may go to a low-priority order while an urgent order misses its SLA.

### General policy

**Priority-first allocation with partial fulfillment and reservation protection.**

Rules:

1. Calculate available stock per SKU from live inventory state.
2. Score and sort open orders by priority score, highest first.
3. Allocate `min(order_remaining_quantity, available_quantity)`.
4. Permit partial allocation for high-priority orders when stock is scarce.
5. Protect stock already picked, packed, or too far advanced in fulfillment.
6. Do not silently take stock from a lower-priority order.
7. Reallocation is allowed only from orders in Created/Allocated states and should be logged or require approval.
8. Mark unfulfilled demand as Partially Allocated, Awaiting Stock, or Backordered.
9. Create a reorder recommendation and explanation.

### Generic allocation logic

```python
available = on_hand - allocated - damaged

orders_for_sku = sorted(
    open_orders_needing_this_sku,
    key=lambda order: order.priority_score,
    reverse=True,
)

for order in orders_for_sku:
    allocated = min(order.remaining_required, available)
    available -= allocated
```

This must work with any SKU, any quantity, and any number of orders. It must not refer to a fixed demo ID.

### Required demo scenario

| Order | Priority | Requested | Stock available | Expected outcome |
|---|---|---:|---:|---|
| `ORD-5001` | Critical | 10 | 7 total | Allocate 7; mark 3 backordered |
| `ORD-5002` | Normal | 5 | 0 remaining | Hold / backorder until replenishment |

### Required explanation

> **Allocation decision:** Allocate 7 units to `ORD-5001` because it is Critical (VIP + Express + SLA risk). Place `ORD-5002` on hold because no verified stock remains. Recommend replenishment for 8 units: 3 to complete `ORD-5001` and 5 to fulfill `ORD-5002`.

### Decision modes

| Decision | Mode | Example |
|---|---|---|
| Normal allocation | Auto-execute | Reserve in-stock inventory for an order |
| Partial allocation | Auto-execute or recommendation | Allocate remaining stock under policy |
| Reallocation from another open order | Approval required | Move reservation from Normal to Critical order |
| Contradictory or unsafe inventory state | Escalate | Physical count is far below system record; no alternate stock |

---

## 8. Low-Stock, Stockout, and Reorder Recommendations

### Purpose

Identify present and future inventory risk, then recommend a quantity and operational action.

### Problem solved

A red “Low Stock” badge does not tell the manager which orders are threatened or how much to buy. The system must connect inventory status to demand.

### Rules

Low stock:

\[
\text{Low stock if } \text{Available stock} \leq \text{Reorder point}
\]

Projected stock risk:

\[
\text{Projected stock} = \text{Available stock} - \text{Demand from open orders}
\]

Suggested reorder:

\[
\text{Target stock} = 2 \times \text{Reorder point}
\]

\[
\text{Suggested reorder} = \max(0, \text{Target stock} - \text{Projected stock})
\]

### Example

```text
Available: 20
Reorder point: 15
Open-order demand: 18
Projected stock: 2
Target stock: 30
Suggested reorder: 28
```

> **Projected stockout risk**
> Current available: 20 · Pending demand: 18 · Projected available: 2
> **Recommended action:** Reorder 28 units to restore target stock and protect pending orders.

### MVP note

Do not build true ML demand forecasting. Use current open-order demand and simple thresholds.

---

## 9. Picking and Packing Management

### Purpose

Give warehouse workers clear, actionable tasks after allocation rather than a generic list of orders.

### Problem solved

Workers need to know what to pick, where to find it, in what order, and what to do when the physical warehouse disagrees with the system.

### Picker workspace

Show:

- Assigned order or pick batch.
- Product name and SKU.
- Quantity to pick.
- Exact source bin, e.g. `A-03-R2-B04`.
- Pick sequence.
- Task status: Pending, In Progress, Picked, Exception.
- Mock barcode/scan confirmation button.
- “Report issue” options:
  - Item missing.
  - Incorrect item.
  - Damaged item.
  - Quantity mismatch.

### Lightweight picking optimization

Do not build real warehouse routing. Use a transparent heuristic:

1. Sort tasks by priority first.
2. Then sort by Zone → Aisle → Rack → Bin.
3. Group nearby tasks into a pick batch.

Example:

> **Optimized Pick Batch `PB-203`**
> Zone A: A-01 → A-03 → A-05
> Zone B: B-02
> Estimated walking reduction: 18% versus separate order picking.

Label any walking improvement as an estimate based on location sequencing.

### Packing workflow

After picking:

- Verify picked quantity versus allocated quantity.
- Optionally suggest carton size with a simple static rule.
- Transition the order from Picked → Packed.

---

## 10. Quality Check and Dispatch

### Purpose

Prevent wrong, incomplete, damaged, or incorrectly labeled shipments from being dispatched.

### Problem solved

A fulfillment flow without a QC gate can ship wrong SKUs, missing quantities, or damaged products—creating returns and customer dissatisfaction.

### QC checklist

- Quantity verified?
- Correct SKU scanned?
- Package integrity acceptable?
- Damaged product found?
- Shipping label generated/validated?

### QC decision rules

| QC result | System action |
|---|---|
| Pass | Mark Ready to Dispatch |
| Quantity mismatch | Move to Exception Review |
| Damaged item | Quarantine item, adjust inventory, search alternate stock |
| Wrong SKU scanned | Reject and return task to picking |
| Label issue | Hold dispatch and create correction task |

### Dispatch requirements

- Mark order as Dispatched.
- Generate mock carrier and tracking ID.
- Record dispatch timestamp.
- Update status/timeline.
- Create audit event.
- Update inventory accounting.

### Inventory update rules

```text
At allocation:
  Available decreases; Allocated increases.

At picking:
  Allocated remains reserved; Picked quantity increases.

At dispatch:
  On-hand decreases; Allocated decreases; shipment is recorded.
```

Do not double-deduct stock.

---

## 11. Exception Management: Detect → Decide → Resolve

### Purpose

Handle real-world disruption in a controlled, repeatable way.

### Problem solved

Warehouse issues occur after allocation: items can be damaged, missing, wrongly scanned, or fail QC. A real system must react to changing facts, not just display an error.

### Event-driven model

```python
EVENT_HANDLERS = {
    "ORDER_CREATED": handle_order_created,
    "ITEM_DAMAGED": handle_item_damaged,
    "ITEM_MISSING": handle_item_missing,
    "QC_FAILED": handle_qc_failed,
    "ORDER_DISPATCHED": handle_order_dispatched,
}
```

Unknown event:

```text
Manual review required — no policy exists for this event type.
```

### 11.1 Damaged-item flow

**Example:** A picker finds 2 damaged units while fulfilling an order requiring 5.

```text
Detect
→ Picker reports ITEM_DAMAGED with SKU, bin, quantity, note/evidence.

Record
→ Create event and audit entry.

Adjust
→ Move units to damaged/quarantine; recalculate available inventory.

Decide
→ Search eligible alternate bins, preferring verified/high-confidence stock.

Resolve
→ Create a replacement pick task, or partially fulfill/backorder and recommend replenishment.

Notify
→ Update order risk, exceptions list, and dashboard alert.
```

Example decision:

> 2 units in `A-03-R2-B04` were quarantined. Two verified replacement units were found in `B-01-R1-B02`. A reassigned pick task has been created.

### 11.2 Missing-item / short-pick flow

**Example:** System expects 5 units in a bin; picker finds only 3.

```text
Detect
→ Picker reports ITEM_MISSING or quantity mismatch.

Record
→ Expected quantity vs actual quantity is saved.

Decide
→ Mark source bin as Needs Count / under investigation.
→ Create a cycle-count task.
→ Search alternate locations.

Resolve
→ Reassign remaining units from another bin, or partially fulfill/backorder.

Escalate
→ If no safe alternate stock exists, require manual review.
```

Example decision:

> Expected 5 units at `A-03-R2-B04`; picker confirmed 3. The bin is flagged for cycle count. Two units are available at `B-01-R1-B02`; a replacement pick task is recommended.

### 11.3 Manual review / escalation

Never pretend every issue has a safe automatic answer.

Example escalation:

> **Manual review required**
> The requested stock cannot be fulfilled, the source bin has a major discrepancy, and no alternate location has sufficient verified inventory.
> Options: partial shipment, backorder, substitute SKU, supplier escalation, or customer notification.

### UI requirements

- Exception/Decision Center.
- Event simulation panel.
- Decision mode label: Auto-executed / Approval required / Manual review required.
- Before/after inventory data where possible.
- Explanation and audit trail for every decision.

---

## 12. Operational Analytics and Bottleneck Identification

### Purpose

Tell a manager where warehouse work is slowing down and what action to take.

### Problem solved

Basic dashboards show counts; they do not identify where orders are stuck or why. A bottleneck occurs when a stage completes work slower than work arrives, creating queues and SLA risk.

### Dashboard metrics

| Metric | Meaning | Formula / source |
|---|---|---|
| Orders pending | Work waiting to be processed | Count grouped by status |
| Fulfillment cycle time | Creation to dispatch time | `dispatched_at - created_at` |
| Pick throughput | Picked volume per hour | `items_picked / hours` |
| Pack throughput | Packed orders per hour | `orders_packed / hours` |
| Stockout events | Inventory failure count | Count of stockout alerts/events |
| Exception rate | Share of orders with issues | `exception_orders / total_orders` |
| Order accuracy | Correctly processed shipments | `correct_orders / dispatched_orders` |
| Stage queue length | Work stuck in each stage | Count grouped by stage |
| Average stage wait time | Time orders wait at a stage | `now - stage_entered_at` |

### Simple bottleneck algorithm

```text
For each stage:
  queue_size = orders currently in the stage
  average_wait_time = now - stage_entered_at
  capacity_per_hour = configured stage capacity

Flag a bottleneck if:
  queue_size > threshold
  OR average_wait_time > SLA threshold
  OR incoming work rate > completion rate
```

### Required dashboard alert

> **Packing bottleneck detected — High**
> 18 orders are waiting in Packing. Average wait: 46 minutes. Packing capacity: 8 orders/hour; incoming rate: 14 orders/hour.
> **Recommended action:** Reassign one worker from Picking, prioritize Critical orders, and batch orders using similar carton sizes.

### MVP note

Use seeded timestamps and configured capacity values. No real-time streaming, advanced labor optimization, or predictive ML is required.

---

## 13. Workflow State Machine

### Order states

```text
Created
→ Prioritized
→ Awaiting Allocation / Partially Allocated / Allocated
→ Ready to Pick
→ Picking
→ Picked
→ Packing
→ Quality Check
→ Ready to Dispatch
→ Dispatched
```

Exception branches:

```text
Awaiting Stock / Backordered
Exception Review
Rework Required
Cancelled
```

### Inventory states

```text
On Hand
→ Available
→ Allocated
→ Picked
→ Dispatched
```

Exception branches:

```text
Damaged / Quarantined
Missing / Under Investigation
```

### Rule

Never allow a user to jump directly from `Created` to `Dispatched`. The API and UI should validate allowed status transitions.

---

## 14. Main Screens

### 1. Command Center

Purpose: manager overview and action queue.

Include:

- KPI cards: pending orders, critical orders, low-stock SKUs, exceptions, average fulfillment time.
- Urgent allocation/shortage card.
- Low-stock/projected stockout alerts.
- Packing bottleneck card.
- Recommended actions list.
- High-priority orders list.

### 2. Orders and Allocation Detail

Purpose: view order risk, priority, stock decision, timeline, and actions.

Include:

- Priority badge and score.
- “Why this priority?” explanation.
- Requested vs allocated vs unfulfilled line items.
- Allocation outcome and rationale.
- Order workflow timeline.
- Risk status.
- Approval/escalation actions when relevant.

### 3. Inventory and Stock Risk

Purpose: stock truth and location-level visibility.

Include:

- SKU table: on hand, allocated, damaged, available, reorder point, projected stock.
- Bin/location breakdown.
- Verification status and confidence badge.
- Low-stock/reorder recommendations.
- Inventory movement history.

### 4. Fulfillment Board

Purpose: operator workflow from pick through dispatch.

Columns:

```text
Ready to Pick → Picking → Packed → Quality Check → Ready to Dispatch → Dispatched
```

Include:

- Priority order cards.
- Pick-task details with bin and quantity.
- Confirm/scan mock action.
- Report issue modal.
- Status transition buttons; drag-and-drop is optional.

### 5. Exceptions and Decision Center

Purpose: review live events, decisions, required approvals, and audit history.

Include:

- Exception queue.
- Auto-executed / Approval required / Manual review filters.
- Decision explanation.
- Alternate-bin suggestions.
- Cycle-count task recommendation.
- Approve/reject action for sensitive reallocations.

### 6. Simulate Event Panel

Purpose: demonstrate that the decision engine reacts to new input rather than prewritten answers.

Inputs:

- Event type: New urgent order / Damaged item / Missing stock / QC failure.
- SKU.
- Quantity.
- Source location.
- Related order.
- Optional note.

After submission, call the same generic event engine used by the rest of the product.

Judges can change stock, requested quantity, priority, or damage quantity and see the recommendation change.

---

## 15. Seeded Demo Dataset

Use mock data as a realistic initial operating state. The data is seeded; decisions are computed dynamically.

### Suggested dataset size

- 20 SKUs.
- 4–6 bins/locations.
- 15–30 orders.
- Several statuses across the fulfillment board.
- Realistic timestamps for dashboard metrics.

### Required scenarios

| Scenario | Seeded facts | Expected calculated behavior |
|---|---|---|
| Scarce stock conflict | SKU-101 has 7 available; Critical order requires 10; Normal order requires 5 | Allocate 7 to Critical, backorder 3; hold Normal; reorder recommendation |
| Low stock | SKU-205 has stock below threshold / high pending demand | Low-stock alert and suggested reorder |
| Damaged pick | 2 units of SKU-301 damaged in a source bin | Quarantine, reduce availability, locate alternate bin or create shortage decision |
| Missing item | Bin expects 5, picker sees 3 | Flag bin Needs Count, create discrepancy/cycle-count task, find alternate bin if possible |
| Packing backlog | 12–18 orders have been in Packing for 45+ minutes | High bottleneck alert and workforce/batching recommendation |
| SLA risk | VIP Express order due in about 90 minutes | Critical priority and queue precedence |
| Happy path | Adequate stock, correct pick, QC pass | Moves from allocation through dispatch and updates inventory |

### Core shortage scenario

```json
{
  "sku": "SKU-101",
  "available_stock": 7,
  "orders": [
    {
      "id": "ORD-5001",
      "priority": "Critical",
      "quantity_requested": 10
    },
    {
      "id": "ORD-5002",
      "priority": "Normal",
      "quantity_requested": 5
    }
  ]
}
```

Expected result:

```json
{
  "ORD-5001": {
    "allocated": 7,
    "unfulfilled": 3,
    "status": "Partially Allocated"
  },
  "ORD-5002": {
    "allocated": 0,
    "unfulfilled": 5,
    "status": "Backordered"
  }
}
```

---

## 16. API Blueprint

Exact URL naming can change, but keep response contracts stable.

### Core read APIs

```text
GET /dashboard
GET /orders
GET /orders/{order_id}
GET /inventory
GET /inventory/{sku_id}
GET /pick-tasks
GET /exceptions
GET /analytics/bottlenecks
GET /audit-logs
```

### Core action APIs

```text
POST /orders
POST /orders/{order_id}/prioritize
POST /orders/{order_id}/allocate
POST /pick-tasks/{task_id}/start
POST /pick-tasks/{task_id}/confirm
POST /events
POST /orders/{order_id}/pack
POST /orders/{order_id}/qc
POST /orders/{order_id}/dispatch
POST /decisions/{decision_id}/approve
POST /decisions/{decision_id}/reject
```

### Example allocation response

```json
{
  "order_id": "ORD-5001",
  "priority": {
    "score": 90,
    "label": "Critical",
    "reasons": [
      "VIP customer",
      "Express shipping",
      "Due within 2 hours",
      "High-value order"
    ]
  },
  "allocation": {
    "status": "Partially Allocated",
    "requested": 10,
    "allocated": 7,
    "unfulfilled": 3,
    "decision_mode": "AUTO_EXECUTED",
    "recommendation": "Reserve 7 verified units; reorder 8 units to cover current shortage."
  }
}
```

---

## 17. Build Scope and Priorities

### Must work end-to-end

- Inventory accounting: on-hand, allocated, damaged, available.
- Orders list, detail, priority calculation, and risk state.
- Priority-first allocation with partial fulfillment/backorder.
- Reorder recommendation.
- Pick task with bin location and damaged/missing-item event action.
- Packing → QC → dispatch state flow.
- Inventory update at allocation, damage, and dispatch.
- Dashboard shortage, exception, and bottleneck alerts.
- One working event simulation panel.
- One fully connected scripted demo story.

### Implement simply

- Pick route: sort by location code.
- Pick batching: group nearby bins.
- Carton recommendation: static rule.
- Carrier/tracking: mock data.
- Audit log: append-only simple records.
- Bottleneck: queue count + average wait threshold.
- Projected stockout: open-order demand only.
- Inventory confidence: simple status/score, not a complex statistical model.

### Skip unless core is complete

- Real carrier API / label buying.
- RFID or barcode hardware.
- WebSockets/live streaming.
- Multi-warehouse optimization.
- Supplier procurement system.
- ML demand forecasting.
- Complex authentication/roles.
- Autonomous LLM decision-maker.
- Real map routing/3D warehouse maps.

---

## 18. Build Strategy

Do not build the entire backend first and integrate at the last minute. Use vertical slices: each slice touches database, backend, and a basic UI screen, so a working flow appears early.

| Slice | Backend | UI | Done when |
|---|---|---|---|
| 1. Smart allocation | Seed data; priority/allocation services and API | Order detail + Run Allocation | The urgent shortage decision is visible and explained |
| 2. Inventory risk | Stock calculation/reorder APIs | Inventory table + alert | Low-stock action card works |
| 3. Exceptions | Damage/missing handlers | Picker issue modal + exception card | Alternate-bin or escalation decision works |
| 4. Workflow | Status-transition validation/APIs | Fulfillment board | Pick → Pack → QC → Dispatch works |
| 5. Analytics | Queue/wait-time calculation | Dashboard bottleneck card | Bottleneck and recommendation appear |
| 6. Enhancement | Confidence logic, approval workflow | Confidence badges / approval UI | Optional; add only after core works |

### Suggested 12-hour build order

| Time | Deliverable |
|---|---|
| Hour 1 | Repo, FastAPI, SQLite, React/Vite, seed data, basic models |
| Hours 2–3 | Priority and allocation engine with tests |
| Hour 4 | Allocation API + Swagger/manual tests |
| Hour 5 | Simple real frontend order screen connected to API |
| Hour 6 | Inventory calculations + reorder alerts |
| Hours 7–8 | Pick tasks + damaged/missing exception flow |
| Hour 9 | Packing, QC, dispatch transitions |
| Hour 10 | Bottleneck engine + dashboard |
| Hour 11 | UI polish, event simulator, audit trail |
| Hour 12 | Deployment, demo data reset, README, pitch rehearsal |

If more time is available, improve UX and tests before adding new modules.

---

## 19. AI/Vibe-Coding Strategy

### Principle

AI tools accelerate implementation. They do not replace the product’s operational decision engine.

Use deterministic rules for allocation, reorder, exceptions, and bottlenecks because they are explainable, testable, auditable, and reliable during a demo.

### Tool roles

| Need | Tool approach |
|---|---|
| Primary coding | VS Code + GitHub Copilot Student |
| Architecture / code review | Free ChatGPT, Claude, or Gemini web tools |
| UI inspiration | Figma, v0, Bolt, or similar only for a starting direction |
| Optional agent | OpenHands only for isolated tasks such as tests, code review, or seed-data generation |

### Copilot usage rules

- Use inline completion freely for repetitive code, forms, API models, tests, and components.
- Use chat/agent requests for small, isolated modules—not “build the whole app.”
- Run the app and review every AI-generated change immediately.
- Commit after every working slice.

Useful implementation prompt:

```text
Create a pure Python inventory allocation service.
Inputs: inventory records with on_hand, allocated, damaged, reorder_point; orders with priority_score and line items.
Rules: available = on_hand - allocated - damaged; process higher priority first; support partial allocation; return allocation decisions, backorders, reorder recommendations, and human-readable reasons.
Do not modify database code. Include unit tests for full allocation, partial allocation, zero stock, and priority conflicts.
```

### Optional LLM feature

A natural-language “Operations Summary” or “Ask Warehouse Copilot” panel can be added only after core functionality works. It must use structured output from the rules engine and must not make inventory allocation decisions itself.

---

## 20. Demo Story

The demo should tell one connected operational story, not merely tour disconnected screens.

### Script

1. **Command Center**
   - Show critical shortage alert, projected low stock, and packing bottleneck.

2. **Critical order**
   - Open `ORD-5001` / `ORD-1042`.
   - Show VIP + Express + deadline priority explanation.

3. **Smart allocation**
   - Run allocation.
   - Show only 7 of 10 units are available.
   - Show 7 reserved for the Critical order, 3 backordered, Normal order held, replenishment suggested.

4. **Picking exception**
   - Open pick task for the allocated units.
   - Simulate/report 2 damaged units.
   - Show quarantine update, alternate-bin search, and reassigned pick task.

5. **Fulfillment completion**
   - Confirm pick → pack → QC pass → dispatch.
   - Show mock tracking ID and correct inventory update.

6. **Return to Command Center**
   - Show updated alerts/KPIs.
   - Highlight Packing bottleneck: queue, wait time, capacity, and recommended workforce/batching action.

7. **Prove it is generic**
   - Open Simulate Event panel.
   - Change stock, requested quantity, order priority, or damage quantity.
   - Submit the event and show the decision changes automatically.

### Judge-facing statement

> “We use seeded data to simulate warehouse operations, but our decisions are not pre-scripted. Each live event is processed through reusable policies that calculate priority, stock availability, allocation, alternate-bin recovery, replenishment, and escalation from current system state. This makes the platform adaptable to changing orders, stock levels, and exceptions.”

### Why this stands out

Most teams may show inventory tables, order tables, and static dashboards. FlowForge demonstrates an end-to-end, explainable decision loop:

```text
Critical order
→ priority explanation
→ scarce inventory allocation
→ lower-priority hold and replenishment
→ picking damage exception
→ alternate-bin recovery
→ QC and dispatch
→ bottleneck insight and action
```

---

## 21. Final Scope Statement

Build all stated hackathon workflows as connected features, but implement the critical decision path deeply and supporting capabilities simply.

The project is successful when it reliably demonstrates:

```text
Urgent order
→ transparent priority score
→ inventory shortage
→ policy-driven allocation
→ partial fulfillment / backorder
→ reorder recommendation
→ damage/missing-item exception
→ alternate-bin recovery or escalation
→ packing/QC/dispatch
→ inventory update
→ bottleneck detection and manager recommendation
```

The project must feel like a real operational product: clear, explainable, action-oriented, and resilient when live warehouse facts change.
