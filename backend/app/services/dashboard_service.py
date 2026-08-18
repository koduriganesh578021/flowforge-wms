"""Read-only aggregation for the Command Center dashboard."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import Decision, Event, Order
from app.models.enums import DecisionMode, DecisionStatus, DecisionType, OrderStatus
from app.schemas.dashboard import CommandCenterResponse
from app.services.bottleneck_engine import get_bottlenecks
from app.services.reorder_engine import OPEN_ORDER_STATUSES, assess_inventory


def get_command_center(db: Session) -> CommandCenterResponse:
    assessments = assess_inventory(db, create_decisions=False)
    pending_orders = db.scalar(select(func.count(Order.id)).where(Order.status.in_(OPEN_ORDER_STATUSES))) or 0
    critical_orders = db.scalar(select(func.count(Order.id)).where(Order.priority_label == "Critical")) or 0
    open_exception_decisions = list(db.scalars(select(Decision).where(
        Decision.decision_type == DecisionType.EXCEPTION,
        Decision.status == DecisionStatus.PENDING,
    ).order_by(Decision.created_at.desc(), Decision.id.desc())))

    bottlenecks = get_bottlenecks(db)[:3]
    alerts = [_exception_alert(db, decision) for decision in open_exception_decisions[:3]]
    actions = _top_actions(db, assessments, open_exception_decisions)
    return CommandCenterResponse(
        kpis={
            "pending_orders": pending_orders,
            "critical_orders": critical_orders,
            "low_stock_skus": sum(item.status in {"Stockout", "High Risk"} for item in assessments),
            "open_exceptions": len(open_exception_decisions),
            "average_fulfillment_time": None,
        },
        top_bottlenecks=bottlenecks,
        top_exceptions=alerts,
        top_actions=actions,
    )


def _exception_alert(db: Session, decision: Decision) -> dict[str, Any]:
    event = db.get(Event, decision.event_id) if decision.event_id else None
    event_type = event.event_type.value if event else "EXCEPTION"
    mode = decision.decision_mode.value
    severity = "HIGH" if mode in {DecisionMode.ESCALATE.value, DecisionMode.MANUAL_REVIEW.value} else "MEDIUM" if mode == DecisionMode.APPROVAL_REQUIRED.value else "LOW"
    if event_type == "QC_FAILED" and decision.order_id:
        summary = f"QC failure for Order #{decision.order_id}"
    elif event_type == "ITEM_DAMAGED":
        summary = f"Damaged stock reported for SKU #{decision.sku_id}"
    elif event_type == "ITEM_MISSING":
        summary = f"Missing stock reported for SKU #{decision.sku_id}"
    else:
        summary = decision.explanation.split(".", 1)[0]
    context: dict[str, Any] = {"decision_id": decision.id, "order_id": decision.order_id, "sku_id": decision.sku_id}
    if event:
        context.update({"event_id": event.id, "bin_id": event.location_id})
    return {"id": decision.id, "event_type": event_type, "severity": severity, "summary": summary, "context": context}


def _top_actions(db: Session, assessments: list, exception_decisions: list[Decision]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for item in sorted((item for item in assessments if (item.suggested_reorder or 0) > 0), key=lambda item: (-item.suggested_reorder, item.sku_id))[:2]:
        actions.append({"action_type": "REORDER", "title": f"Reorder {item.sku_code}", "description": f"Available {item.available_stock}, target {item.target_stock} → suggest reorder {item.suggested_reorder}.", "context": {"sku_id": item.sku_id, "suggested_reorder": item.suggested_reorder}})
    for decision in exception_decisions[:2]:
        actions.append({"action_type": "EXCEPTION_REVIEW", "title": f"Review exception #{decision.id}", "description": decision.explanation, "context": {"decision_id": decision.id, "order_id": decision.order_id, "sku_id": decision.sku_id}})
    critical_orders = list(db.scalars(select(Order).where(Order.priority_label == "Critical", Order.status.in_((OrderStatus.PRIORITIZED, OrderStatus.AWAITING_ALLOCATION, OrderStatus.BACKORDERED))).order_by(Order.id)))
    for order in critical_orders[:2]:
        actions.append({"action_type": "ALLOCATE_ORDER", "title": f"Allocate Order #{order.id}", "description": f"Critical order {order.order_code} is waiting for allocation.", "context": {"order_id": order.id}})
    return actions[:5]
