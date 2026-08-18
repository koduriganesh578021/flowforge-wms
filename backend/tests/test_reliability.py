import pytest
from fastapi import HTTPException

from app.models.entities import Inventory
from app.models.enums import OrderStatus
from app.services.event_engine import DuplicateEventError, process_event
from app.services.order_workflow import dispatch_order
from test_event_engine import add_order, add_stock, setup_catalog


def test_duplicate_inventory_event_is_rejected_without_second_mutation(session_factory):
    session = session_factory()
    setup_catalog(session)
    add_stock(session, 1, 1, 1, 10)
    session.commit()
    payload = {"event_type": "ITEM_DAMAGED", "sku_id": 1, "location_id": 1, "quantity": 2}
    process_event(payload, session)
    with pytest.raises(DuplicateEventError):
        process_event(payload, session)
    assert session.get(Inventory, 1).on_hand == 8


def test_dispatching_an_already_dispatched_order_returns_conflict(session_factory):
    session = session_factory()
    setup_catalog(session)
    order, _ = add_order(session, 900, 1, 1, status=OrderStatus.DISPATCHED)
    session.commit()
    with pytest.raises(HTTPException) as error:
        dispatch_order(session, order.id)
    assert error.value.status_code == 409
    assert "already been dispatched" in str(error.value.detail)
