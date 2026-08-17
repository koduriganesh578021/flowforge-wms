from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.entities import Decision, Inventory, Location, Order, OrderItem, Product
from app.models.enums import CustomerTier, InventoryVerificationStatus, OrderStatus, ShippingType
from app.services.allocation_engine import allocate_eligible_orders


NOW = datetime(2026, 8, 16, 15, 0, tzinfo=timezone.utc)


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, class_=Session)
    yield factory
    Base.metadata.drop_all(engine)


def add_order(session, order_id, sku_id, quantity, *, priority=50, status=OrderStatus.CREATED,
              due_hours=4, created_minutes=0, allocated=0):
    order = Order(id=order_id, order_code=f"ORDER-{order_id}", customer_name="Test", customer_tier=CustomerTier.STANDARD,
                  shipping_type=ShippingType.STANDARD, created_at=NOW + timedelta(minutes=created_minutes),
                  due_at=NOW + timedelta(hours=due_hours) if due_hours is not None else None,
                  order_value=0, status=status, priority_score=priority)
    session.add(order)
    item = OrderItem(id=order_id * 10 + sku_id, order_id=order_id, sku_id=sku_id,
                     quantity_requested=quantity, quantity_allocated=allocated, quantity_picked=0, quantity_dispatched=0)
    session.add(item)
    return order, item


def add_stock(session, inventory_id, sku_id, location_id, quantity, *, allocated=0,
              status=InventoryVerificationStatus.VERIFIED, confidence=100):
    session.add(Inventory(id=inventory_id, sku_id=sku_id, location_id=location_id, on_hand=quantity,
                          allocated=allocated, picked=0, damaged=0, verification_status=status,
                          confidence_score=confidence))


def setup_catalog(session, sku_count=1, bin_count=1):
    for sku_id in range(1, sku_count + 1):
        session.add(Product(id=sku_id, sku_code=f"SKU-{sku_id}", name=f"SKU {sku_id}", reorder_point=0, target_stock=0))
    for location_id in range(1, bin_count + 1):
        session.add(Location(id=location_id, warehouse="W", zone="A", aisle="01", rack="01", bin=str(location_id),
                             location_code=f"A-{location_id:02d}"))
    session.commit()


def test_full_allocation_from_one_verified_bin(session_factory):
    session = session_factory(); setup_catalog(session)
    _, item = add_order(session, 1, 1, 5); add_stock(session, 1, 1, 1, 5); session.commit()
    result = allocate_eligible_orders(session)
    assert result.orders[0].lines[0].line_status == "Allocated"
    assert item.quantity_allocated == 5
    assert result.orders[0].lines[0].source_bins[0].location_code == "A-01"


def test_shortage_creates_pending_reallocation_proposal_without_mutation(session_factory):
    session = session_factory(); setup_catalog(session)
    _, high = add_order(session, 1, 1, 10, priority=90)
    _, low = add_order(session, 2, 1, 5, priority=10, allocated=5)
    add_stock(session, 1, 1, 1, 12, allocated=5); session.commit()
    result = allocate_eligible_orders(session)
    assert (high.quantity_allocated, low.quantity_allocated) == (7, 5)
    assert result.unresolved_shortages[0].total_unfulfilled_across_orders == 3
    assert len(result.decisions_created) == 1
    decision = session.scalar(select(Decision).where(Decision.decision_mode == "approval_required")); assert decision.decision_mode.value == "approval_required"
    assert decision.status.value == "pending"


def test_zero_stock_leaves_order_unchanged_and_reports_shortage(session_factory):
    session = session_factory(); setup_catalog(session)
    order, item = add_order(session, 1, 1, 5); add_stock(session, 1, 1, 1, 0); session.commit()
    result = allocate_eligible_orders(session)
    assert item.quantity_allocated == 0 and order.status == OrderStatus.CREATED
    assert result.orders[0].lines[0].line_status == "Backordered"
    assert result.unresolved_shortages[0].total_unfulfilled_across_orders == 5


def test_allocation_uses_multiple_bins_in_required_order(session_factory):
    session = session_factory(); setup_catalog(session, bin_count=2)
    _, item = add_order(session, 1, 1, 6)
    add_stock(session, 1, 1, 1, 3, confidence=95); add_stock(session, 2, 1, 2, 4, confidence=80); session.commit()
    result = allocate_eligible_orders(session)
    assert item.quantity_allocated == 6
    assert [(bin.location_code, bin.quantity_taken) for bin in result.orders[0].lines[0].source_bins] == [("A-01", 3), ("A-02", 3)]


def test_quarantined_inventory_is_ignored(session_factory):
    session = session_factory(); setup_catalog(session)
    _, item = add_order(session, 1, 1, 4)
    add_stock(session, 1, 1, 1, 10, status=InventoryVerificationStatus.QUARANTINED); session.commit()
    result = allocate_eligible_orders(session)
    assert item.quantity_allocated == 0
    assert "Quarantined inventory was excluded" in result.orders[0].lines[0].explanation


def test_equal_priority_uses_due_at_then_created_at(session_factory):
    session = session_factory(); setup_catalog(session)
    _, later = add_order(session, 1, 1, 5, priority=70, due_hours=5, created_minutes=0)
    _, earlier_due = add_order(session, 2, 1, 5, priority=70, due_hours=2, created_minutes=10)
    add_stock(session, 1, 1, 1, 5); session.commit()
    allocate_eligible_orders(session)
    assert (earlier_due.quantity_allocated, later.quantity_allocated) == (5, 0)


def test_low_confidence_only_stock_is_allocated_with_cycle_count_recommendation(session_factory):
    session = session_factory(); setup_catalog(session, bin_count=2)
    _, item = add_order(session, 1, 1, 5)
    add_stock(session, 1, 1, 1, 0); add_stock(session, 2, 1, 2, 5, status=InventoryVerificationStatus.NEEDS_COUNT, confidence=40); session.commit()
    result = allocate_eligible_orders(session)
    assert item.quantity_allocated == 5
    assert result.confidence_recommendations
    assert "Confidence warning" in result.orders[0].lines[0].explanation


def test_multi_line_order_allocates_each_sku_independently(session_factory):
    session = session_factory(); setup_catalog(session, sku_count=2, bin_count=2)
    order, first = add_order(session, 1, 1, 4)
    second = OrderItem(id=12, order_id=order.id, sku_id=2, quantity_requested=3, quantity_allocated=0, quantity_picked=0, quantity_dispatched=0); session.add(second)
    add_stock(session, 1, 1, 1, 4); add_stock(session, 2, 2, 2, 1); session.commit()
    result = allocate_eligible_orders(session)
    assert (first.quantity_allocated, second.quantity_allocated, order.status) == (4, 1, OrderStatus.PARTIALLY_ALLOCATED)
    assert result.orders[0].lines[1].line_status == "Partially Allocated"
    assert result.unresolved_shortages[0].sku_id == 2


def test_repeated_call_is_idempotent(session_factory):
    session = session_factory(); setup_catalog(session)
    _, item = add_order(session, 1, 1, 5); add_stock(session, 1, 1, 1, 5); session.commit()
    allocate_eligible_orders(session)
    result = allocate_eligible_orders(session)
    assert result.orders[0].lines[0].quantity_newly_allocated == 0
    assert item.quantity_allocated == 5
    assert session.scalars(select(Decision)).all().__len__() == 1


def test_transaction_rolls_back_all_writes_on_flush_error(session_factory, monkeypatch):
    session = session_factory(); setup_catalog(session)
    _, item = add_order(session, 1, 1, 5); stock = Inventory(id=1, sku_id=1, location_id=1, on_hand=5, allocated=0, picked=0, damaged=0); session.add(stock); session.commit()
    original_flush = session.flush
    monkeypatch.setattr(session, "flush", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("write failure")))
    with pytest.raises(RuntimeError, match="write failure"):
        allocate_eligible_orders(session)
    monkeypatch.setattr(session, "flush", original_flush)
    session.rollback()
    assert (item.quantity_allocated, stock.allocated) == (0, 0)
