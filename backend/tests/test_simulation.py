from sqlalchemy import select

from app.models.entities import Event, Inventory, Order
from app.models.enums import InventoryVerificationStatus, OrderStatus
from app.schemas.simulation import SimulateEventRequest
from app.services.simulation_service import simulate_event
from test_event_engine import add_order, add_stock, setup_catalog


def test_new_urgent_order_is_created_and_prioritized(session_factory):
    session = session_factory()
    setup_catalog(session)
    result = simulate_event(session, SimulateEventRequest(
        event_type="NEW_URGENT_ORDER", customer_name="VIP Customer", sku_id=1, quantity=3,
    ))
    order = session.get(Order, result["summary"]["created_order_id"])
    assert order is not None
    assert order.priority_score is not None
    assert order.priority_label in {"High", "Critical"}
    assert order.status == OrderStatus.PRIORITIZED


def test_damaged_item_returns_before_after_and_persists_event(session_factory):
    session = session_factory()
    setup_catalog(session)
    add_stock(session, 1, 1, 1, 10)
    add_stock(session, 2, 1, 2, 4)
    session.commit()
    result = simulate_event(session, SimulateEventRequest(event_type="ITEM_DAMAGED", sku_id=1, bin_id=1, quantity=2))
    inventory = session.get(Inventory, 1)
    assert inventory.on_hand == 8
    assert inventory.verification_status == InventoryVerificationStatus.QUARANTINED
    assert result["summary"]["inventory_changes"][0]["before"] == 10
    assert session.scalar(select(Event).where(Event.id == result["summary"]["event_id"])) is not None


def test_missing_item_marks_bin_for_count(session_factory):
    session = session_factory()
    setup_catalog(session)
    add_stock(session, 1, 1, 1, 10)
    add_stock(session, 2, 1, 2, 4)
    session.commit()
    simulate_event(session, SimulateEventRequest(event_type="ITEM_MISSING", sku_id=1, bin_id=1, quantity=2))
    assert session.get(Inventory, 1).verification_status == InventoryVerificationStatus.NEEDS_COUNT


def test_qc_failure_returns_changed_order_status(session_factory):
    session = session_factory()
    setup_catalog(session)
    order, _ = add_order(session, 10, 1, 2)
    session.commit()
    result = simulate_event(session, SimulateEventRequest(event_type="QC_FAILURE", order_id=order.id))
    session.refresh(order)
    assert result["summary"]["event_id"] is not None
    assert result["summary"]["new_order_status"] == order.status.value
    assert order.status in {OrderStatus.EXCEPTION_REVIEW, OrderStatus.REWORK_REQUIRED}
