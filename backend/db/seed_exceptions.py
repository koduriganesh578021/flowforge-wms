"""Seed three realistic exception examples for the Exceptions page.

The examples intentionally reuse the documented demo records:
* ITEM_DAMAGED: one SKU-105 unit in location 3 is quarantined automatically
  because the alternate SKU-105 inventory in location 5 can cover it
  (AUTO_EXECUTED).
* ITEM_MISSING: two SKU-110 units are missing from the existing ORD-1003
  short-pick task, requiring a physical audit (ESCALATE).
* QC_FAILED: one of the two SKU-103 units on ORD-1005 fails cosmetic QC and
  needs approval before fulfillment can be split (APPROVAL_REQUIRED).

Run from ``backend`` after ``python seed.py`` with
``python db/seed_exceptions.py``. Each event has a stable seed key, so reruns
do not duplicate data.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal
from app.models.entities import Decision, Event, Inventory, Order, OrderItem, PickTask
from app.models.enums import DecisionMode, DecisionStatus, DecisionType, EventType


SEED_ACTOR = "demo-exception-seed"

SAMPLE_EXCEPTIONS = (
    {
        "seed_key": "demo-exception-damaged-auto",
        "event_type": EventType.ITEM_DAMAGED,
        "sku_id": 5,
        "location_id": 3,
        "order_id": None,
        "quantity": 1,
        "reported_by": "R. Naidu",
        "created_at": datetime.fromisoformat("2026-08-16T12:05:00+05:30"),
        "notes": "One unit found with water damage during a cycle count.",
        "decision_mode": DecisionMode.AUTO_EXECUTED,
        "decision_status": DecisionStatus.APPLIED,
        "explanation": "One damaged SKU-105 unit was quarantined. Verified alternate stock in B-01-02 covers the shortage, so a replacement pick was recommended automatically.",
    },
    {
        "seed_key": "demo-exception-missing-escalate",
        "event_type": EventType.ITEM_MISSING,
        "sku_id": 10,
        "location_id": 2,
        "order_id": 3,
        "order_item_id": 31,
        "pick_task_id": 1,
        "quantity": 2,
        "reported_by": "S. Kumar",
        "created_at": datetime.fromisoformat("2026-08-16T14:45:00+05:30"),
        "notes": "Two units remain unaccounted for after the ORD-1003 short pick.",
        "decision_mode": DecisionMode.ESCALATE,
        "decision_status": DecisionStatus.APPLIED,
        "explanation": "Two SKU-110 units are missing from the existing ORD-1003 short pick. No alternate inventory is available, so inventory control must complete a physical audit.",
    },
    {
        "seed_key": "demo-exception-qc-approval",
        "event_type": EventType.QC_FAILED,
        "sku_id": 3,
        "location_id": 2,
        "order_id": 5,
        "order_item_id": 51,
        "quantity": 1,
        "quantity_inspected": 2,
        "reported_by": "QC Team",
        "created_at": datetime.fromisoformat("2026-08-16T15:05:00+05:30"),
        "notes": "One Bluetooth Speaker Mini unit failed cosmetic inspection.",
        "decision_mode": DecisionMode.APPROVAL_REQUIRED,
        "decision_status": DecisionStatus.PENDING,
        "explanation": "One of two SKU-103 units failed cosmetic QC on ORD-1005. Supervisor approval is required to split fulfillment and hold the rejected unit.",
    },
)


def _sync_postgres_sequences(session) -> None:
    """Ensure PostgreSQL primary key sequences match MAX(id) to prevent unique constraint collisions."""
    if session.bind.dialect.name == "postgresql":
        for table in (
            "products",
            "locations",
            "inventory",
            "orders",
            "order_items",
            "pick_tasks",
            "events",
            "decisions",
        ):
            try:
                session.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
                    )
                )
            except Exception:
                pass


def _require_seed_references(session, sample: dict) -> None:
    inventory = session.scalar(select(Inventory).where(
        Inventory.sku_id == sample["sku_id"], Inventory.location_id == sample["location_id"],
    ))
    if inventory is None:
        raise ValueError(f"Missing inventory for SKU {sample['sku_id']} at location {sample['location_id']}")

    order_id = sample.get("order_id")
    if order_id is not None and session.get(Order, order_id) is None:
        raise ValueError(f"Missing order {order_id}")

    order_item_id = sample.get("order_item_id")
    if order_item_id is not None:
        order_item = session.get(OrderItem, order_item_id)
        if order_item is None or order_item.order_id != order_id or order_item.sku_id != sample["sku_id"]:
            raise ValueError(f"Order item {order_item_id} does not match the seeded exception")

    pick_task_id = sample.get("pick_task_id")
    if pick_task_id is not None:
        pick_task = session.get(PickTask, pick_task_id)
        if pick_task is None or pick_task.order_item_id != order_item_id or pick_task.source_location_id != sample["location_id"]:
            raise ValueError(f"Pick task {pick_task_id} does not match the seeded exception")


def seed() -> None:
    with SessionLocal.begin() as session:
        _sync_postgres_sequences(session)

        for sample in SAMPLE_EXCEPTIONS:
            _require_seed_references(session, sample)
            event = session.scalar(select(Event).where(
                Event.reported_by == SEED_ACTOR,
                Event.payload.like(f'%"seed_key": "{sample["seed_key"]}"%'),
            ))
            if event is None:
                payload = {
                    "seed_key": sample["seed_key"],
                    "notes": sample["notes"],
                    **{key: sample[key] for key in ("order_item_id", "pick_task_id", "quantity_inspected") if key in sample},
                }
                event = Event(
                    event_type=sample["event_type"], order_id=sample["order_id"], sku_id=sample["sku_id"],
                    location_id=sample["location_id"], quantity=sample["quantity"],
                    payload=json.dumps(payload, sort_keys=True), reported_by=SEED_ACTOR,
                    created_at=sample["created_at"],
                )
                try:
                    with session.begin_nested():
                        session.add(event)
                        session.flush()
                except IntegrityError:
                    _sync_postgres_sequences(session)
                    event = session.scalar(select(Event).where(
                        Event.reported_by == SEED_ACTOR,
                        Event.payload.like(f'%"seed_key": "{sample["seed_key"]}"%'),
                    ))
                    if event is None:
                        # Retry insert after syncing sequences
                        session.add(event)
                        session.flush()

            if event is not None:
                decision = session.scalar(select(Decision).where(
                    Decision.event_id == event.id, Decision.decision_type == DecisionType.EXCEPTION,
                ))
                if decision is None:
                    decision = Decision(
                        event_id=event.id, order_id=sample["order_id"], sku_id=sample["sku_id"],
                        decision_type=DecisionType.EXCEPTION, decision_mode=sample["decision_mode"],
                        status=sample["decision_status"], explanation=sample["explanation"], actor=SEED_ACTOR,
                        created_at=sample["created_at"],
                    )
                    try:
                        with session.begin_nested():
                            session.add(decision)
                            session.flush()
                    except IntegrityError:
                        _sync_postgres_sequences(session)

        _sync_postgres_sequences(session)

    print(f"Seeded {len(SAMPLE_EXCEPTIONS)} sample exception event(s) (existing entries were preserved).")


if __name__ == "__main__":
    seed()
