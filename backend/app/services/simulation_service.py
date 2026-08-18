"""Thin coordinator translating demo-friendly scenarios into domain operations."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Inventory, Order, OrderItem, Product
from app.models.enums import CustomerTier, OrderStatus, ShippingType
from app.schemas.simulation import SimulateEventRequest
from app.services.event_engine import process_event
from app.services.priority_engine import evaluate_priority


def simulate_event(db: Session, payload: SimulateEventRequest) -> dict[str, Any]:
    if payload.event_type == "NEW_URGENT_ORDER":
        return _new_urgent_order(db, payload)
    if payload.event_type in {"ITEM_DAMAGED", "ITEM_MISSING"}:
        return _inventory_event(db, payload)
    return _qc_failure(db, payload)


def _new_urgent_order(db: Session, payload: SimulateEventRequest) -> dict[str, Any]:
    if not payload.customer_name or payload.sku_id is None or payload.quantity is None:
        raise ValueError("customer_name, sku_id, and quantity are required for a new urgent order.")
    if db.get(Product, payload.sku_id) is None:
        raise ValueError("SKU not found.")
    due_at = _parse_due_at(payload.due_at) or datetime.now(timezone.utc) + timedelta(hours=2)
    order = Order(
        order_code=f"SIM-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}", customer_name=payload.customer_name,
        customer_tier=CustomerTier.VIP, shipping_type=ShippingType.EXPRESS, due_at=due_at,
        status=OrderStatus.CREATED, stage_entered_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()
    db.add(OrderItem(order_id=order.id, sku_id=payload.sku_id, quantity_requested=payload.quantity))
    assessment = evaluate_priority(order)
    order.priority_score = assessment.score
    order.priority_label = assessment.label
    order.risk_status = assessment.risk_flag
    order.status = OrderStatus.PRIORITIZED
    db.commit()
    return {"event_type": payload.event_type, "summary": {
        "created_order_id": order.id, "affected_order_ids": [order.id],
        "initial_allocation_status": order.status.value, "priority_score": assessment.score,
        "priority_label": assessment.label,
        "explanation": f"Created {assessment.label.lower()} urgent order {order.order_code}; priority was calculated and it is ready for allocation.",
    }}


def _inventory_event(db: Session, payload: SimulateEventRequest) -> dict[str, Any]:
    if payload.sku_id is None or payload.bin_id is None or payload.quantity is None:
        raise ValueError("sku_id, bin_id, and quantity are required for an inventory event.")
    inventory = db.scalar(select(Inventory).where(Inventory.sku_id == payload.sku_id, Inventory.location_id == payload.bin_id))
    if inventory is None:
        raise ValueError("Inventory record not found for this SKU and bin.")
    before = inventory.on_hand
    decision = process_event({
        "event_type": payload.event_type, "sku_id": payload.sku_id, "location_id": payload.bin_id,
        "quantity": payload.quantity, "reported_by": "simulation", "note": payload.note,
    }, db)
    db.refresh(inventory)
    return {"event_type": payload.event_type, "summary": {
        "event_id": decision["event_id"], "decision_mode": decision.get("decision_mode_value", decision["decision_mode"]),
        "affected_order_ids": [decision["order_id"]] if decision.get("order_id") else [],
        "inventory_changes": [{"sku_id": payload.sku_id, "bin_id": payload.bin_id, "field": "on_hand", "before": before, "after": inventory.on_hand}],
        "explanation": decision["explanation"],
    }}


def _qc_failure(db: Session, payload: SimulateEventRequest) -> dict[str, Any]:
    if payload.order_id is None:
        raise ValueError("order_id is required for a QC failure.")
    order = db.get(Order, payload.order_id)
    if order is None:
        raise ValueError("Order not found.")
    item = db.scalar(select(OrderItem).where(OrderItem.order_id == order.id).order_by(OrderItem.id))
    if item is None:
        raise ValueError("Order has no items to inspect.")
    decision = process_event({
        "event_type": "QC_FAILED", "order_id": order.id, "sku_id": item.sku_id,
        "quantity_inspected": max(item.quantity_picked, item.quantity_allocated, 1), "quantity_rejected": 1,
        "failure_reason": payload.note or "Simulated QC failure", "reported_by": "simulation",
    }, db)
    db.refresh(order)
    return {"event_type": payload.event_type, "summary": {
        "event_id": decision["event_id"], "decision_mode": decision.get("decision_mode_value", decision["decision_mode"]),
        "affected_order_ids": [order.id], "new_order_status": order.status.value,
        "explanation": decision["explanation"],
    }}


def _parse_due_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("due_at must be an ISO-8601 timestamp.") from exc
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
