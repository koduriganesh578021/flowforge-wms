# FlowForge WMS — MVP Data & Build Plan

## 1. Essential Entities and Relationships

| Entity | Purpose | Key relationships |
|---|---|---|
| **Product** | SKU master data | 1—N Inventory, 1—N OrderItem, 1—N PickTask |
| **Location** | Warehouse bin | 1—N Inventory, 1—N PickTask (source_location) |
| **Inventory** | Stock of one SKU at one bin | N—1 Product, N—1 Location; unique on (sku_id, location_id) |
| **Order** | Customer order header | 1—N OrderItem, 1—N PickTask, 1—N Decision |
| **OrderItem** | Requested SKU/qty within an order | N—1 Order, N—1 Product |
| **PickTask** | Unit of picking work | N—1 Order, N—1 OrderItem, N—1 Location |
| **Event** | Raw fact fed into the system | N—1 Order (nullable), N—1 Product (nullable), N—1 Location (nullable) |
| **Decision** | Engine output + audit record | N—1 Event (nullable), N—1 Order (nullable), N—1 Product (nullable) |

Everything downstream — priority, allocation, exceptions, bottlenecks — is a **read** over Product/Location/Inventory/Order/OrderItem, and a **write** to Inventory/OrderItem/PickTask plus one Decision row. `Decision` doubles as the audit log (it already carries mode, explanation, actor, before/after), so a separate `AuditLog` table is redundant scope for a hackathon build.

---

## 2. MVP Database Schema

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    sku_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    reorder_point INTEGER NOT NULL DEFAULT 0,
    target_stock INTEGER NOT NULL DEFAULT 0,
    unit_of_measure TEXT DEFAULT 'unit'
);

CREATE TABLE locations (
    id INTEGER PRIMARY KEY,
    warehouse TEXT NOT NULL,
    zone TEXT NOT NULL,
    aisle TEXT NOT NULL,
    rack TEXT NOT NULL,
    bin TEXT NOT NULL,
    location_code TEXT UNIQUE NOT NULL
);

CREATE TABLE inventory (
    id INTEGER PRIMARY KEY,
    sku_id INTEGER NOT NULL REFERENCES products(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    on_hand INTEGER NOT NULL DEFAULT 0,
    allocated INTEGER NOT NULL DEFAULT 0,
    picked INTEGER NOT NULL DEFAULT 0,
    damaged INTEGER NOT NULL DEFAULT 0,
    confidence_score INTEGER NOT NULL DEFAULT 100,
    verification_status TEXT NOT NULL DEFAULT 'verified',
    last_verified_at DATETIME,
    UNIQUE (sku_id, location_id)
    -- available is NOT a column — compute it: on_hand - allocated - damaged
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    order_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_tier TEXT NOT NULL DEFAULT 'Standard',
    shipping_type TEXT NOT NULL DEFAULT 'Standard',
    created_at DATETIME NOT NULL,
    due_at DATETIME,
    order_value REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Created',
    priority_score INTEGER,
    priority_label TEXT,
    risk_status TEXT,
    stage_entered_at DATETIME
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    sku_id INTEGER NOT NULL REFERENCES products(id),
    quantity_requested INTEGER NOT NULL,
    quantity_allocated INTEGER NOT NULL DEFAULT 0,
    quantity_picked INTEGER NOT NULL DEFAULT 0,
    quantity_dispatched INTEGER NOT NULL DEFAULT 0
    -- quantity_unfulfilled is NOT a column — compute it: requested - dispatched
);

CREATE TABLE pick_tasks (
    id INTEGER PRIMARY KEY,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id),
    source_location_id INTEGER NOT NULL REFERENCES locations(id),
    quantity_required INTEGER NOT NULL,
    quantity_confirmed INTEGER NOT NULL DEFAULT 0,
    sequence INTEGER,
    status TEXT NOT NULL DEFAULT 'Pending',
    assigned_worker TEXT
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    event_type TEXT NOT NULL,
    order_id INTEGER REFERENCES orders(id),
    sku_id INTEGER REFERENCES products(id),
    location_id INTEGER REFERENCES locations(id),
    quantity INTEGER,
    payload TEXT,           -- JSON blob for note/evidence/extra fields
    reported_by TEXT,
    created_at DATETIME NOT NULL
);

CREATE TABLE decisions (
    id INTEGER PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    order_id INTEGER REFERENCES orders(id),
    sku_id INTEGER REFERENCES products(id),
    decision_type TEXT NOT NULL,      -- allocation | reorder | exception | bottleneck | status_transition
    decision_mode TEXT NOT NULL,      -- auto_executed | approval_required | manual_review
    status TEXT NOT NULL DEFAULT 'applied',  -- pending | approved | rejected | applied
    explanation TEXT NOT NULL,
    before_state TEXT,                -- JSON
    after_state TEXT,                 -- JSON
    actor TEXT NOT NULL DEFAULT 'system',
    created_at DATETIME NOT NULL
);

-- Indexes that matter for the dashboard/queue queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_priority ON orders(priority_score DESC);
CREATE INDEX idx_pick_tasks_status ON pick_tasks(status);
CREATE INDEX idx_decisions_mode_status ON decisions(decision_mode, status);
```

8 tables total. `available`, `unfulfilled`, and cycle-time metrics are all computed in the service layer, never stored.

---

## 3. Five Highest-Risk Technical Mistakes

1. **Persisting derived numbers instead of computing them.** `available`, `quantity_unfulfilled`, and cycle-time metrics must be calculated at read time from `on_hand/allocated/damaged` and `requested/dispatched`. Store them and they *will* drift the moment two code paths update inventory independently — this is the single most common source of "the dashboard says something different than the order screen" bugs.

2. **No transaction boundary around allocation.** When two orders both want the same SKU, allocation must read inventory, decide, and write the new `allocated`/`order_items` values inside one DB transaction (or serialized per-SKU). Do it as separate read-then-write calls and a second request racing in between will over-allocate stock that no longer exists.

3. **Hardcoding demo IDs into the engine.** Any `if order_id == "ORD-5001"` branch inside the priority/allocation/exception logic defeats the entire premise ("not pre-scripted") and will visibly break the moment a judge uses the Simulate Event panel with different numbers. Write the rules as pure functions over generic inputs from day one — test them against arbitrary SKUs/quantities, not just the seeded scenario.

4. **No enforced status-transition whitelist.** Without a table of allowed `from_status → to_status` moves, a stray API call or UI bug can jump `Created → Dispatched`, silently skipping the allocation/pick/QC steps and corrupting inventory accounting. Validate every transition server-side, not just by disabling buttons in the UI.

5. **Collapsing "decision computed" into "decision executed."** A `decision_mode = approval_required` or `manual_review` row must be written as `status = pending` and *not* applied to inventory/order state until an explicit approve action fires. If the allocation engine writes the decision and mutates the database in the same step regardless of mode, the approval workflow disappears and the audit trail records what happened rather than what was proposed.

---

## 4. Minimal Implementation Order

1. **Schema + seed data only.** Create all 8 tables, seed 20 SKUs / 4–6 bins / 15–30 orders per the blueprint's scenarios. No engine code yet — just prove the data model holds the required scarce-stock, low-stock, damaged, and missing-item scenarios.

2. **Read APIs + computed fields.** `GET /orders`, `GET /inventory` with `available`/`unfulfilled` computed in the service layer (not stored). Wire a bare frontend orders/inventory table to confirm the model end-to-end before any decision logic exists.

3. **Priority engine.** Pure function, unit-tested against arbitrary inputs (not the demo IDs). Expose `POST /orders/{id}/prioritize`. Smallest self-contained slice; validates the generic-engine approach early.

4. **Allocation engine.** Pure function + transactional write (mistake #2). Wire `POST /orders/{id}/allocate` and the order-detail screen showing the priority-first, partial-allocation outcome. This is the core demo scenario — get it fully explainable before moving on.

5. **Workflow state machine.** Status-transition whitelist, `pick_tasks`, and the pick → pack → QC → dispatch endpoints, wired to the exact inventory-update rules from the blueprint (allocated→picked at pick, on-hand/allocated decrement only at dispatch — never double-deduct).

6. **Exception engine.** Damaged/missing handlers reusing the same event→decision pattern from step 4; alternate-bin search; approval-gated reallocation (mistake #5).

7. **Bottleneck/analytics.** Pure read-side aggregation over the timestamps and statuses already in place — no new write logic needed.

8. **Simulate Event panel + audit trail UI.** Point it at the exact same event handler used by every other flow, proving genericness live — then polish.

This mirrors the blueprint's own vertical-slice plan but trims it to the dependency-critical path: each step only starts once the previous one's data is real and queryable, so no two half-built layers get integrated at once.