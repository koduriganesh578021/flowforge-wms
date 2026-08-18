from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.entities import Decision, Event, Inventory, Location, Order, Product
from app.models.enums import (
    CustomerTier,
    DecisionMode,
    DecisionStatus,
    DecisionType,
    EventType,
    InventoryVerificationStatus,
    OrderStatus,
    ShippingType,
)


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


def seed_catalog(session: Session) -> None:
    session.add_all([
        Product(id=1, sku_code="SKU-1", name="Demo SKU", reorder_point=1, target_stock=5),
        Location(id=1, warehouse="WH", zone="A", aisle="01", rack="01", bin="01", location_code="A-01"),
    ])
    session.commit()


def test_resolve_exception_releases_order_from_review(client_and_session_factory):
    client, factory = client_and_session_factory
    session = factory(); seed_catalog(session)
    session.add(Order(
        id=1, order_code="ORD-1", customer_name="Customer", customer_tier=CustomerTier.STANDARD,
        shipping_type=ShippingType.STANDARD, created_at=datetime.now(timezone.utc), order_value=100,
        status=OrderStatus.EXCEPTION_REVIEW, risk_status="Blocked",
    ))
    event = Event(event_type=EventType.QC_FAILED, order_id=1, sku_id=1, location_id=1, quantity=1, payload="{}")
    session.add(event); session.flush()
    session.add(Decision(
        event_id=event.id, order_id=1, sku_id=1, decision_type=DecisionType.EXCEPTION,
        decision_mode=DecisionMode.APPROVAL_REQUIRED, status=DecisionStatus.PENDING, explanation="QC review required",
    ))
    session.commit(); event_id = event.id; session.close()

    response = client.post(f"/exceptions/{event_id}/resolve", json={"actor": "supervisor", "note": "QC cleared"})

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    assert response.json()["resolution_note"] == "QC cleared"
    session = factory()
    assert session.get(Decision, 1).status == DecisionStatus.RESOLVED
    assert session.get(Order, 1).status == OrderStatus.READY_TO_PICK
    assert session.get(Order, 1).risk_status == "Safe"
    session.close()


def test_resolve_inventory_discrepancy_verifies_bin(client_and_session_factory):
    client, factory = client_and_session_factory
    session = factory(); seed_catalog(session)
    session.add(Inventory(
        id=1, sku_id=1, location_id=1, on_hand=3, allocated=0, picked=0, damaged=0,
        verification_status=InventoryVerificationStatus.NEEDS_COUNT, confidence_score=40,
    ))
    event = Event(event_type=EventType.INVENTORY_DISCREPANCY, sku_id=1, location_id=1, quantity=2, payload="{}")
    session.add(event); session.flush()
    session.add(Decision(
        event_id=event.id, sku_id=1, decision_type=DecisionType.EXCEPTION,
        decision_mode=DecisionMode.APPROVAL_REQUIRED, status=DecisionStatus.APPLIED,
        explanation="Cycle count needs review",
    ))
    session.commit(); event_id = event.id; session.close()

    response = client.post(f"/exceptions/{event_id}/resolve", json={})

    assert response.status_code == 200
    session = factory()
    inventory = session.get(Inventory, 1)
    assert inventory.verification_status == InventoryVerificationStatus.VERIFIED
    assert inventory.confidence_score == 100
    assert inventory.last_verified_at is not None
    session.close()
