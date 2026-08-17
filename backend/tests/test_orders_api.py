from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.entities import Decision, Inventory, Location, Order, OrderItem, PickTask, Product
from app.models.enums import CustomerTier, OrderStatus, PickTaskStatus, ShippingType


@pytest.fixture()
def client_and_session_factory():
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, class_=Session)

    def override_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def seed_order(session_factory, *, status=OrderStatus.CREATED, stock=5):
    session = session_factory()
    now = datetime.now(timezone.utc)
    session.add_all([
        Product(id=1, sku_code="SKU-1", name="Demo SKU", reorder_point=1, target_stock=5),
        Location(id=1, warehouse="WH", zone="A", aisle="01", rack="01", bin="01", location_code="A-01"),
        Order(id=1, order_code="ORD-1", customer_name="VIP Customer", customer_tier=CustomerTier.VIP,
              shipping_type=ShippingType.EXPRESS, created_at=now, due_at=now + timedelta(hours=1),
              order_value=25_000, status=status),
        OrderItem(id=1, order_id=1, sku_id=1, quantity_requested=5, quantity_allocated=0,
                  quantity_picked=0, quantity_dispatched=0),
        Inventory(id=1, sku_id=1, location_id=1, on_hand=stock, allocated=0, picked=0, damaged=0),
    ])
    session.commit()
    return session


def test_list_and_detail_include_compact_and_derived_fields(client_and_session_factory):
    client, factory = client_and_session_factory
    session = seed_order(factory)
    session.add(PickTask(id=1, order_item_id=1, source_location_id=1, quantity_required=5,
                         quantity_confirmed=0, status=PickTaskStatus.PENDING))
    session.commit(); session.close()

    listing = client.get("/orders")
    assert listing.status_code == 200
    assert listing.json()[0]["order_code"] == "ORD-1"
    assert set(listing.json()[0]) == {"id", "order_code", "customer_name", "status", "priority_score", "priority_label", "risk_status", "due_at"}

    detail = client.get("/orders/1")
    assert detail.status_code == 200
    body = detail.json()
    assert body["items"][0]["unfulfilled_at_allocation"] == 5
    assert body["items"][0]["remaining_to_ship"] == 5
    assert body["pick_tasks"][0]["id"] == 1
    assert body["priority_explanation"] is None


def test_prioritize_persists_score_and_explainable_decision(client_and_session_factory):
    client, factory = client_and_session_factory
    session = seed_order(factory); session.close()

    response = client.post("/orders/1/prioritize")
    assert response.status_code == 200
    assert response.json()["score"] == 90
    assert response.json()["reasons"]

    session = factory()
    order = session.get(Order, 1)
    decision = session.scalar(select(Decision).where(Decision.order_id == 1))
    assert (order.priority_score, order.priority_label, order.risk_status) == (90, "Critical", "Safe")
    assert decision.decision_type.value == "prioritization"
    assert client.get("/orders/1").json()["priority_explanation"]["score"] == 90
    session.close()


def test_allocate_returns_requested_order_and_is_idempotent(client_and_session_factory):
    client, factory = client_and_session_factory
    session = seed_order(factory); session.close()
    assert client.post("/orders/1/prioritize").status_code == 200

    first = client.post("/orders/1/allocate")
    second = client.post("/orders/1/allocate")
    assert first.status_code == second.status_code == 200
    assert first.json()["order"]["lines"][0]["quantity_newly_allocated"] == 5
    assert second.json()["order"]["lines"][0]["quantity_newly_allocated"] == 0

    session = factory()
    assert session.get(OrderItem, 1).quantity_allocated == 5
    assert session.get(Inventory, 1).allocated == 5
    assert session.scalars(select(Decision)).all().__len__() == 1
    session.close()


def test_allocate_requires_calculated_priority(client_and_session_factory):
    client, factory = client_and_session_factory
    session = seed_order(factory); session.close()

    response = client.post("/orders/1/allocate")

    assert response.status_code == 409
    assert response.json() == {"detail": "Priority must be calculated before inventory allocation."}


def test_unknown_and_final_orders_return_expected_errors(client_and_session_factory):
    client, factory = client_and_session_factory
    assert client.get("/orders/99").status_code == 404
    assert client.post("/orders/99/prioritize").status_code == 404
    assert client.post("/orders/99/allocate").status_code == 404

    session = seed_order(factory, status=OrderStatus.PACKING); session.close()
    response = client.post("/orders/1/allocate")
    assert response.status_code == 409
