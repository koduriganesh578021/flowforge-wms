from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.entities import Decision, Event, Inventory, Location, Order, OrderItem, Product
from app.models.enums import (
    CustomerTier,
    DecisionMode,
    EventType,
    InventoryVerificationStatus,
    OrderStatus,
    ShippingType,
)
from app.services.event_engine import process_event


NOW = datetime(2026, 8, 16, 15, 0, tzinfo=timezone.utc)


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, class_=Session)
    yield factory
    Base.metadata.drop_all(engine)


def add_order(session, order_id, sku_id, quantity, *, status=OrderStatus.ALLOCATED, risk_status="Safe"):
    order = Order(
        id=order_id,
        order_code=f"ORD-{order_id}",
        customer_name="Test",
        customer_tier=CustomerTier.STANDARD,
        shipping_type=ShippingType.STANDARD,
        created_at=NOW,
        due_at=NOW + timedelta(hours=2),
        order_value=100.0,
        status=status,
        risk_status=risk_status,
        priority_score=50,
    )
    session.add(order)
    item = OrderItem(
        id=order_id * 10 + sku_id,
        order_id=order_id,
        sku_id=sku_id,
        quantity_requested=quantity,
        quantity_allocated=quantity,
    )
    session.add(item)
    return order, item


def add_stock(session, inventory_id, sku_id, location_id, quantity, *, status=InventoryVerificationStatus.VERIFIED, confidence=100):
    session.add(
        Inventory(
            id=inventory_id,
            sku_id=sku_id,
            location_id=location_id,
            on_hand=quantity,
            allocated=0,
            picked=0,
            damaged=0,
            verification_status=status,
            confidence_score=confidence,
        )
    )


def setup_catalog(session, sku_count=1, bin_count=2):
    for sku_id in range(1, sku_count + 1):
        session.add(
            Product(
                id=sku_id,
                sku_code=f"SKU-{sku_id}",
                name=f"SKU {sku_id}",
                reorder_point=5,
                target_stock=10,
            )
        )
    for location_id in range(1, bin_count + 1):
        session.add(
            Location(
                id=location_id,
                warehouse="W1",
                zone="A",
                aisle="01",
                rack="R1",
                bin=f"B{location_id:02d}",
                location_code=f"A-01-R1-B{location_id:02d}",
            )
        )
    session.commit()


def test_item_damaged_auto_executes_when_verified_alternate_exists(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=1, bin_count=2)
    order, _ = add_order(session, 101, 1, 10, status=OrderStatus.PICKING)
    add_stock(session, 1, 1, 1, 10)
    add_stock(session, 2, 1, 2, 8)
    session.commit()

    result = process_event(
        {
            "event_type": EventType.ITEM_DAMAGED,
            "sku_id": 1,
            "location_id": 1,
            "quantity_damaged": 4,
            "order_id": 101,
            "worker_id": "picker-12",
        },
        session,
    )

    session.refresh(order)
    source = session.get(Inventory, 1)
    assert result["decision_mode"] == DecisionMode.AUTO_EXECUTED.name
    assert source.on_hand == 6
    assert source.damaged == 4
    assert source.verification_status == InventoryVerificationStatus.QUARANTINED
    assert order.status == OrderStatus.PICKING
    assert session.scalar(select(Event).where(Event.event_type == EventType.ITEM_DAMAGED)) is not None
    assert session.scalar(select(Decision).where(Decision.decision_mode == DecisionMode.AUTO_EXECUTED)) is not None


def test_item_damaged_requires_approval_for_lower_confidence_replacement(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=1, bin_count=2)
    order, _ = add_order(session, 102, 1, 10)
    add_stock(session, 1, 1, 1, 10)
    add_stock(session, 2, 1, 2, 5, status=InventoryVerificationStatus.NEEDS_COUNT, confidence=45)
    session.commit()

    result = process_event(
        {
            "event_type": EventType.ITEM_DAMAGED,
            "sku_id": 1,
            "location_id": 1,
            "quantity_damaged": 5,
            "order_id": 102,
            "operator_id": "operator-3",
        },
        session,
    )

    assert result["decision_mode"] == DecisionMode.APPROVAL_REQUIRED.name
    assert order.status == OrderStatus.ALLOCATED
    decision = session.scalar(select(Decision).where(Decision.decision_mode == DecisionMode.APPROVAL_REQUIRED))
    assert decision is not None and decision.status.value == "pending"


def test_item_missing_marks_needs_count_and_auto_executes_with_alt_stock(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=1, bin_count=2)
    order, _ = add_order(session, 103, 1, 12)
    add_stock(session, 1, 1, 1, 12)
    add_stock(session, 2, 1, 2, 8)
    session.commit()

    result = process_event(
        {
            "event_type": EventType.ITEM_MISSING,
            "sku_id": 1,
            "location_id": 1,
            "quantity_missing": 4,
            "order_id": 103,
            "reported_by": "picker-5",
        },
        session,
    )

    session.refresh(order)
    source = session.get(Inventory, 1)
    assert result["decision_mode"] == DecisionMode.AUTO_EXECUTED.name
    assert source.on_hand == 8
    assert source.verification_status == InventoryVerificationStatus.NEEDS_COUNT
    assert order.status == OrderStatus.ALLOCATED
    assert session.scalar(select(Decision).where(Decision.decision_mode == DecisionMode.AUTO_EXECUTED)) is not None


def test_item_missing_escalates_when_no_alternate_stock_remains(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=1, bin_count=1)
    order, _ = add_order(session, 104, 1, 8)
    add_stock(session, 1, 1, 1, 8)
    session.commit()

    result = process_event(
        {
            "event_type": EventType.ITEM_MISSING,
            "sku_id": 1,
            "location_id": 1,
            "quantity_missing": 8,
            "order_id": 104,
        },
        session,
    )

    assert result["decision_mode"] == DecisionMode.ESCALATE.name
    assert order.status == OrderStatus.ALLOCATED
    assert order.risk_status == "Blocked"
    decision = session.scalar(select(Decision).where(Decision.decision_mode == DecisionMode.ESCALATE))
    assert decision is not None


def test_qc_failed_auto_executes_for_minor_mismatch_and_escalates_for_critical_defect(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=1, bin_count=2)
    order, _ = add_order(session, 105, 1, 10)
    add_stock(session, 1, 1, 1, 10)
    session.commit()

    result = process_event(
        {
            "event_type": EventType.QC_FAILED,
            "order_id": 105,
            "sku_id": 1,
            "quantity_inspected": 10,
            "quantity_rejected": 1,
            "failure_reason": "Quantity Mismatch",
            "reported_by": "qc-1",
        },
        session,
    )
    session.refresh(order)
    assert result["decision_mode"] == DecisionMode.AUTO_EXECUTED.name
    assert order.status == OrderStatus.EXCEPTION_REVIEW

    critical_order, _ = add_order(session, 106, 1, 12)
    add_stock(session, 2, 1, 2, 12)
    session.commit()
    critical_result = process_event(
        {
            "event_type": EventType.QC_FAILED,
            "order_id": 106,
            "sku_id": 1,
            "quantity_inspected": 12,
            "quantity_rejected": 12,
            "failure_reason": "Critical safety defect detected",
            "reported_by": "qc-1",
        },
        session,
    )
    session.refresh(critical_order)
    assert critical_result["decision_mode"] == DecisionMode.ESCALATE.name
    assert critical_order.status == OrderStatus.REWORK_REQUIRED
