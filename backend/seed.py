"""Load the documented FlowForge demo scenario into the local SQLite database.

Run from this directory with ``python seed.py``.  The operation is deliberately
deterministic: it replaces all data in the application tables on every run.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, inspect, text

from app.database import Base, SessionLocal, engine
from app.models.entities import Decision, Event, Inventory, Location, Order, OrderItem, PickTask, Product
from app.models.enums import (
    CustomerTier,
    EventType,
    InventoryVerificationStatus,
    OrderStatus,
    PickTaskStatus,
    ShippingType,
)


ROOT_DIR = Path(__file__).resolve().parents[1]
SCENARIO_FILE = ROOT_DIR / "docs" / "demo-scenarios.md"

EVENT_TYPES = {
    "damage_reported": EventType.ITEM_DAMAGED,
    "missing_reported": EventType.ITEM_MISSING,
}


def load_scenario() -> dict:
    """Read the JSON scenario payload from its Markdown-named source file."""
    source = SCENARIO_FILE.read_text(encoding="utf-8")
    start, end = source.find("{"), source.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON scenario found in {SCENARIO_FILE}")
    return json.loads(source[start : end + 1])


def as_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def clear_existing_data(session) -> None:
    """Clear child tables first so every rerun starts from the documented facts."""
    for model in (Decision, Event, PickTask, OrderItem, Inventory, Order, Location, Product):
        session.execute(delete(model))


def ensure_seed_schema() -> None:
    """Add columns introduced for the scenario when reusing an older local DB."""
    required_columns = {
        "order_items": {"fulfillment_status": "VARCHAR"},
        "pick_tasks": {
            "assigned_at": "DATETIME",
            "started_at": "DATETIME",
            "completed_at": "DATETIME",
        },
    }
    with engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, columns in required_columns.items():
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


def seed() -> None:
    scenario = load_scenario()
    Base.metadata.create_all(bind=engine)
    ensure_seed_schema()

    with SessionLocal.begin() as session:
        clear_existing_data(session)

        for row in scenario["products"]:
            session.add(Product(**{key: row[key] for key in (
                "id", "sku_code", "name", "category", "reorder_point", "target_stock", "unit_of_measure"
            )}))

        for row in scenario["locations"]:
            session.add(Location(**{key: row[key] for key in (
                "id", "warehouse", "zone", "aisle", "rack", "bin", "location_code"
            )}))

        for row in scenario["inventory"]:
            session.add(Inventory(
                id=row["id"], sku_id=row["sku_id"], location_id=row["location_id"],
                on_hand=row["on_hand"], allocated=row["allocated"], picked=row["picked"],
                damaged=row["damaged"],
                verification_status=InventoryVerificationStatus(row["verification_status"].lower().replace(" ", "_")),
                last_verified_at=as_datetime(row["last_verified_at"]),
            ))

        for row in scenario["orders"]:
            session.add(Order(
                id=row["id"], order_code=row["order_code"], customer_name=row["customer_name"],
                customer_tier=CustomerTier(row["customer_tier"]), shipping_type=ShippingType(row["shipping_type"]),
                order_value=row["order_value"], status=OrderStatus(row["status"]),
                created_at=as_datetime(row["created_at"]), due_at=as_datetime(row["due_at"]),
                stage_entered_at=as_datetime(row["current_stage_entered_at"]),
            ))
            for item in row["order_items"]:
                session.add(OrderItem(
                    id=item["id"], order_id=row["id"], sku_id=item["sku_id"],
                    quantity_requested=item["quantity_requested"], quantity_allocated=item["quantity_allocated"],
                    quantity_picked=item["quantity_picked"], quantity_dispatched=item["quantity_dispatched"],
                    fulfillment_status=item["fulfillment_status"],
                ))

        for row in scenario["pick_tasks"]:
            session.add(PickTask(
                id=row["id"], order_item_id=row["order_item_id"], source_location_id=row["source_location_id"],
                quantity_required=row["quantity_required"], quantity_confirmed=row["quantity_confirmed"],
                sequence=row["sequence"], status=PickTaskStatus(row["status"]),
                assigned_worker=row["assigned_worker"],
                assigned_at=as_datetime(row["assigned_at"]), started_at=as_datetime(row["started_at"]),
                completed_at=as_datetime(row["completed_at"]),
            ))

        for row in scenario["events"]:
            session.add(Event(
                id=row["id"], event_type=EVENT_TYPES[row["event_type"]], order_id=row["order_id"],
                sku_id=row["sku_id"], location_id=row["location_id"], quantity=row["quantity"],
                payload=row["payload"], reported_by=row["reported_by"], created_at=as_datetime(row["created_at"]),
            ))

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

    print(
        "FlowForge demo data seeded successfully: "
        f"{len(scenario['products'])} SKUs, {len(scenario['locations'])} bins, "
        f"{len(scenario['orders'])} orders, {len(scenario['pick_tasks'])} pick task(s), "
        f"and {len(scenario['events'])} events."
    )


if __name__ == "__main__":
    seed()
