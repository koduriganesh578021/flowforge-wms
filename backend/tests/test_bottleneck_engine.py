from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.entities import Order
from app.models.enums import CustomerTier, OrderStatus, ShippingType
from app.services.bottleneck_engine import get_bottlenecks


NOW = datetime(2026, 8, 18, 12, 0, tzinfo=timezone.utc)


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, class_=Session)
    yield factory
    Base.metadata.drop_all(engine)


def add_orders(db: Session, current_status: OrderStatus, waits: list[int], start_id: int) -> None:
    for offset, wait in enumerate(waits):
        order_id = start_id + offset
        db.add(Order(
            id=order_id, order_code=f"ORD-{order_id}", customer_name="Demo",
            customer_tier=CustomerTier.STANDARD, shipping_type=ShippingType.STANDARD,
            created_at=NOW - timedelta(hours=2), order_value=1, status=current_status,
            stage_entered_at=NOW - timedelta(minutes=wait),
        ))
    db.commit()


def by_stage(results: list[dict]) -> dict[str, dict]:
    return {result["stage"]: result for result in results}


def test_queue_wait_severity_and_recommendations(session_factory):
    db = session_factory()
    add_orders(db, OrderStatus.READY_TO_PICK, [16, 20], 1)
    add_orders(db, OrderStatus.PICKING, [1, 1, 1, 1, 1, 1], 10)
    add_orders(db, OrderStatus.QUALITY_CHECK, [31], 20)

    results = by_stage(get_bottlenecks(db, now=NOW))
    ready = results["Ready to Pick"]
    assert (ready["queue_size"], ready["average_wait_minutes"], ready["severity"]) == (2, 18.0, "MEDIUM")
    assert "pick wave" in ready["recommendation"]
    assert results["Picking"]["severity"] == "HIGH"
    assert results["Quality Check"]["severity"] == "HIGH"
    assert "QC reviewer" in results["Quality Check"]["recommendation"]
    db.close()


def test_empty_stage_is_low(session_factory):
    db = session_factory()
    results = by_stage(get_bottlenecks(db, now=NOW))
    packing = results["Packing"]
    assert (packing["queue_size"], packing["average_wait_minutes"], packing["severity"]) == (0, 0.0, "LOW")
    db.close()


def test_all_orders_in_one_stage_is_high(session_factory):
    db = session_factory()
    add_orders(db, OrderStatus.PACKING, [5, 5, 5, 5, 5, 5], 1)
    results = by_stage(get_bottlenecks(db, now=NOW))
    assert results["Packing"]["severity"] == "HIGH"
    db.close()
