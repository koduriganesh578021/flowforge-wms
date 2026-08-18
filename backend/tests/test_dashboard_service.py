from datetime import timedelta

from app.models.entities import Decision, Event, Order
from app.models.enums import DecisionMode, DecisionStatus, DecisionType, EventType, OrderStatus
from app.services.dashboard_service import get_command_center
from test_event_engine import NOW, add_order, add_stock, setup_catalog


def test_command_center_computes_kpis_actions_and_exception_alerts(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=2, bin_count=1)
    add_stock(session, 1, 1, 1, 2)
    add_stock(session, 2, 2, 1, 20)
    critical, _ = add_order(session, 1, 1, 6, status=OrderStatus.AWAITING_ALLOCATION)
    critical.priority_label = "Critical"
    for order_id in range(2, 8):
        order = Order(id=order_id, order_code=f"ORD-{order_id}", customer_name="Packing", status=OrderStatus.PACKING, created_at=NOW, stage_entered_at=NOW - timedelta(minutes=45), priority_score=20)
        session.add(order)
    session.flush()
    event = Event(event_type=EventType.QC_FAILED, order_id=critical.id, sku_id=1, location_id=1, quantity=1, payload="{}")
    session.add(event); session.flush()
    decision = Decision(event_id=event.id, order_id=critical.id, sku_id=1, decision_type=DecisionType.EXCEPTION, decision_mode=DecisionMode.ESCALATE, status=DecisionStatus.PENDING, explanation="QC requires manual review")
    session.add(decision); session.commit()

    result = get_command_center(session)
    assert result.kpis.pending_orders >= 7
    assert result.kpis.critical_orders == 1
    assert result.kpis.low_stock_skus >= 1
    assert result.kpis.open_exceptions == 1
    assert result.top_bottlenecks[0].severity == "HIGH"
    assert result.top_exceptions[0].summary == "QC failure for Order #1"
    assert any(action.action_type == "REORDER" for action in result.top_actions)
    assert any(action.action_type == "EXCEPTION_REVIEW" for action in result.top_actions)


def test_command_center_bottlenecks_prioritize_severity_then_queue(session_factory):
    session = session_factory()
    setup_catalog(session, sku_count=1, bin_count=1)
    add_stock(session, 1, 1, 1, 10)
    for order_id in range(1, 7):
        session.add(Order(id=order_id, order_code=f"ORD-{order_id}", customer_name="Packing", status=OrderStatus.PACKING, created_at=NOW, stage_entered_at=NOW - timedelta(minutes=60), priority_score=10))
    session.commit()
    result = get_command_center(session)
    assert result.top_bottlenecks[0].stage == "Packing"
    assert result.top_bottlenecks[0].severity == "HIGH"
