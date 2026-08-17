from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.entities import Inventory, Location, Order, OrderItem, PickTask, Product
from app.models.enums import CustomerTier, OrderStatus, PickTaskStatus, ShippingType
from app.services.order_workflow import confirm_order_picked, dispatch_order, transition_order


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, class_=Session)
    yield factory
    Base.metadata.drop_all(engine)


def seed_order(factory, *, picked: int = 0, confirmed: int = 0):
    db = factory()
    now = datetime.now(timezone.utc)
    db.add_all([
        Product(id=1, sku_code="SKU-1", name="Demo SKU", reorder_point=1, target_stock=10),
        Location(id=1, warehouse="WH", zone="A", aisle="01", rack="01", bin="01", location_code="A-01-01"),
        Inventory(id=1, sku_id=1, location_id=1, on_hand=10, allocated=5, picked=0, damaged=0),
        Order(id=1, order_code="ORD-1", customer_name="Customer", customer_tier=CustomerTier.STANDARD,
              shipping_type=ShippingType.STANDARD, created_at=now, order_value=100, status=OrderStatus.CREATED),
        OrderItem(id=1, order_id=1, sku_id=1, quantity_requested=5, quantity_allocated=5,
                  quantity_picked=picked, quantity_dispatched=0),
        PickTask(id=1, order_item_id=1, source_location_id=1, quantity_required=5,
                 quantity_confirmed=confirmed, status=PickTaskStatus.PENDING),
    ])
    db.commit()
    return db


def test_full_valid_workflow_and_dispatch_accounting(session_factory):
    db = seed_order(session_factory)
    for next_status in (OrderStatus.PRIORITIZED, OrderStatus.ALLOCATED, OrderStatus.READY_TO_PICK, OrderStatus.PICKING):
        transition_order(db, 1, next_status)
    confirm_order_picked(db, 1)
    for next_status in (OrderStatus.PACKING, OrderStatus.QUALITY_CHECK, OrderStatus.READY_TO_DISPATCH):
        transition_order(db, 1, next_status)

    before = db.get(Inventory, 1)
    assert (before.on_hand, before.allocated) == (10, 5)
    dispatched = dispatch_order(db, 1)
    inventory = db.get(Inventory, 1)
    item = db.get(OrderItem, 1)

    assert dispatched.status == OrderStatus.DISPATCHED
    assert (inventory.on_hand, inventory.allocated) == (5, 0)
    assert item.quantity_dispatched == 5
    db.close()


@pytest.mark.parametrize("current,new", [
    (OrderStatus.CREATED, OrderStatus.DISPATCHED),
    (OrderStatus.PACKING, OrderStatus.READY_TO_PICK),
    (OrderStatus.DISPATCHED, OrderStatus.PICKING),
])
def test_invalid_transitions_are_rejected(session_factory, current, new):
    db = seed_order(session_factory)
    order = db.get(Order, 1)
    order.status = current
    db.commit()
    with pytest.raises(HTTPException, match="Invalid status transition") as exc:
        transition_order(db, 1, new)
    assert exc.value.status_code == 409
    db.close()


def test_dispatch_rejects_incomplete_pick(session_factory):
    db = seed_order(session_factory, picked=4, confirmed=4)
    order = db.get(Order, 1)
    order.status = OrderStatus.READY_TO_DISPATCH
    db.commit()

    with pytest.raises(HTTPException, match="fully allocated and picked") as exc:
        dispatch_order(db, 1)
    assert exc.value.status_code == 409
    db.close()
