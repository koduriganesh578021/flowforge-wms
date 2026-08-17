"""Deterministic, stage-based operational bottleneck analytics."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import Decision, Event, Order
from app.models.enums import DecisionStatus, DecisionType, OrderStatus
from app.services.reorder_engine import OPEN_ORDER_STATUSES, assess_inventory


STAGES: tuple[tuple[str, tuple[OrderStatus, ...]], ...] = (
    ("Ready to Pick", (OrderStatus.READY_TO_PICK,)),
    ("Picking", (OrderStatus.PICKING,)),
    ("Picked", (OrderStatus.PICKED,)),
    ("Packing", (OrderStatus.PACKING,)),
    ("Quality Check", (OrderStatus.QUALITY_CHECK, OrderStatus.QC)),
    ("Ready to Dispatch", (OrderStatus.READY_TO_DISPATCH,)),
)

RECOMMENDATIONS = {
    "Ready to Pick": "Release the next pick wave, prioritize Critical orders, and stage pick lists by zone.",
    "Picking": "Reassign one worker to picking, prioritize Critical orders, and batch nearby bins.",
    "Picked": "Move completed picks to packing, clear staging space, and verify exception-tagged lines.",
    "Packing": "Reassign one worker to packing, prioritize Critical orders, and batch similar carton sizes.",
    "Quality Check": "Add a temporary QC reviewer, focus on High-risk orders, and pre-stage packed orders.",
    "Ready to Dispatch": "Open an additional dispatch window, prioritize Critical/High orders, and pre-print labels.",
}

SEVERITY_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}


def get_bottlenecks(db: Session, *, now: datetime | None = None) -> list[dict]:
    """Return current queue and wait-time pressure for each fulfillment stage."""
    current_time = _as_utc(now or datetime.now(timezone.utc))
    bottlenecks = []
    for stage, statuses in STAGES:
        orders = list(db.scalars(select(Order).where(Order.status.in_(statuses))))
        waits = [_wait_minutes(current_time, order.stage_entered_at) for order in orders]
        average_wait = round(sum(waits) / len(waits), 2) if waits else 0.0
        bottlenecks.append({
            "stage": stage,
            "queue_size": len(orders),
            "average_wait_minutes": average_wait,
            "severity": _severity(len(orders), average_wait),
            "recommendation": RECOMMENDATIONS[stage],
        })
    return _sort_bottlenecks(bottlenecks)


def get_dashboard_summary(db: Session, *, now: datetime | None = None) -> dict:
    bottlenecks = get_bottlenecks(db, now=now)
    pending_orders = db.scalar(select(func.count(Order.id)).where(Order.status.in_(OPEN_ORDER_STATUSES))) or 0
    critical_orders = db.scalar(select(func.count(Order.id)).where(Order.priority_label == "Critical")) or 0
    low_stock_skus = sum(
        assessment.status in {"Stockout", "High Risk"}
        for assessment in assess_inventory(db, create_decisions=False)
    )
    open_exceptions = db.scalar(select(func.count(func.distinct(Event.id))).join(Event.decisions).where(
        Decision.decision_type == DecisionType.EXCEPTION,
        Decision.status == DecisionStatus.PENDING,
    )) or 0
    return {
        "pending_orders": pending_orders,
        "critical_orders": critical_orders,
        "low_stock_skus": low_stock_skus,
        "open_exceptions": open_exceptions,
        "average_fulfillment_time": None,
        "top_bottlenecks": bottlenecks[:3],
    }


def _severity(queue_size: int, average_wait_minutes: float) -> str:
    if queue_size > 5 or average_wait_minutes > 30:
        return "HIGH"
    if queue_size > 3 or average_wait_minutes > 15:
        return "MEDIUM"
    return "LOW"


def _wait_minutes(now: datetime, stage_entered_at: datetime | None) -> float:
    if stage_entered_at is None:
        return 0.0
    return max(0.0, (now - _as_utc(stage_entered_at)).total_seconds() / 60)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _sort_bottlenecks(bottlenecks: list[dict]) -> list[dict]:
    return sorted(
        bottlenecks,
        key=lambda item: (SEVERITY_RANK[item["severity"]], -item["queue_size"], -item["average_wait_minutes"]),
    )
