from __future__ import annotations

import json

from collections.abc import Mapping
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import Decision, Event, Inventory, Order
from app.models.enums import (
    DecisionMode,
    DecisionStatus,
    DecisionType,
    EventType,
    InventoryVerificationStatus,
    OrderStatus,
)


def process_event(event: Mapping[str, Any] | None, db: Session) -> dict[str, Any]:
    payload = dict(event or {})
    raw_event_type = payload.get("event_type") or payload.get("type")
    event_type = _normalize_event_type(raw_event_type)

    if event_type == EventType.ITEM_DAMAGED:
        result = _handle_item_damaged(payload, db)
    elif event_type == EventType.ITEM_MISSING:
        result = _handle_item_missing(payload, db)
    elif event_type == EventType.INVENTORY_DISCREPANCY:
        result = _handle_inventory_discrepancy(payload, db)
    elif event_type == EventType.QC_FAILED:
        result = _handle_qc_failed(payload, db)
    else:
        raise ValueError(f"Unsupported event type: {raw_event_type!r}")

    db.commit()
    return result


def _handle_item_damaged(event: Mapping[str, Any], db: Session) -> dict[str, Any]:
    sku_id = _coerce_int(event.get("sku_id"))
    location_id = _coerce_int(event.get("location_id"))
    order_id = _coerce_int(event.get("order_id"))
    quantity_damaged = max(1, _coerce_int(event.get("quantity_damaged") or event.get("quantity") or 0))
    worker_id = str(event.get("worker_id") or event.get("operator_id") or event.get("reported_by") or "system")
    order = _get_order(db, order_id)

    event_record = _create_event_record(
        db,
        event_type=EventType.ITEM_DAMAGED,
        payload=event,
        order_id=order_id,
        sku_id=sku_id,
        location_id=location_id,
        quantity=quantity_damaged,
        reported_by=worker_id,
    )

    source_inventory = _get_inventory(db, sku_id, location_id)
    if source_inventory is None:
        source_inventory = Inventory(
            sku_id=sku_id,
            location_id=location_id,
            on_hand=0,
            allocated=0,
            picked=0,
            damaged=0,
            verification_status=InventoryVerificationStatus.QUARANTINED,
            confidence_score=0,
        )
        db.add(source_inventory)
        db.flush()

    before_on_hand = source_inventory.on_hand
    before_damaged = source_inventory.damaged
    before_verification = source_inventory.verification_status
    source_inventory.on_hand = max(0, source_inventory.on_hand - quantity_damaged)
    source_inventory.damaged += quantity_damaged
    source_inventory.verification_status = InventoryVerificationStatus.QUARANTINED

    alternate_bins = _find_alternate_bins(db, sku_id, location_id)
    verified_available = sum(_available_quantity(item) for item in alternate_bins if item.verification_status == InventoryVerificationStatus.VERIFIED)
    all_available = sum(_available_quantity(item) for item in alternate_bins)

    if order is not None and order.status in {OrderStatus.ALLOCATED, OrderStatus.PICKING, OrderStatus.READY_TO_PICK}:
        order_status = order.status
    elif order is not None:
        order_status = order.status
    else:
        order_status = OrderStatus.ALLOCATED

    if verified_available >= quantity_damaged:
        decision_mode = DecisionMode.AUTO_EXECUTED
        decision_status = DecisionStatus.APPLIED
        if order is None:
            order_status = OrderStatus.ALLOCATED
        explanation = (
            f"Damaged stock quarantined: {quantity_damaged} units removed from bin {location_id}. "
            f"Verified alternate inventory covers the shortage and a replacement pick was recommended."
        )
        if order is not None:
            order.risk_status = "Safe"
    elif all_available >= quantity_damaged:
        decision_mode = DecisionMode.APPROVAL_REQUIRED
        decision_status = DecisionStatus.PENDING
        if order is None:
            order_status = OrderStatus.ALLOCATED
        explanation = (
            f"Damaged stock quarantined: {quantity_damaged} units removed from bin {location_id}. "
            f"Alternate stock exists in lower-confidence bins and requires supervisor approval before reassignment."
        )
        if order is not None:
            order.risk_status = "At Risk"
    else:
        decision_mode = DecisionMode.ESCALATE
        decision_status = DecisionStatus.APPLIED
        order_status = OrderStatus.AWAITING_STOCK if order is None else order.status
        explanation = (
            f"Damaged stock quarantined: {quantity_damaged} units removed from bin {location_id}. "
            f"No alternate stock remains, so emergency procurement and customer communication are required."
        )
        if order is not None:
            order.risk_status = "Blocked"

    if order is not None and order.status != order_status:
        order.status = order_status

    decision = _create_decision_record(
        db,
        event_record=event_record,
        order_id=order_id,
        sku_id=sku_id,
        decision_type=DecisionType.EXCEPTION,
        decision_mode=decision_mode,
        status=decision_status,
        explanation=explanation,
        before_state={"on_hand": before_on_hand, "damaged": before_damaged, "verification_status": before_verification.value if before_verification else None},
        after_state={"on_hand": source_inventory.on_hand, "damaged": source_inventory.damaged, "verification_status": source_inventory.verification_status.value},
    )

    return {
        "event_id": event_record.id,
        "decision_id": decision.id,
        "event_type": EventType.ITEM_DAMAGED.value,
        "decision_mode": decision_mode.name,
        "decision_mode_value": decision_mode.value,
        "order_status": order.status if order is not None else order_status,
        "explanation": explanation,
        "order_id": order_id,
        "sku_id": sku_id,
        "location_id": location_id,
    }


def _handle_inventory_discrepancy(event: Mapping[str, Any], db: Session) -> dict[str, Any]:
    sku_id = _coerce_int(event.get("sku_id"))
    location_id = _coerce_int(event.get("location_id"))
    new_quantity = _coerce_int(event.get("new_quantity"))
    inventory = _get_inventory(db, sku_id, location_id)
    if inventory is None:
        raise ValueError("Inventory record not found")
    if new_quantity is None or new_quantity < 0:
        raise ValueError("new_quantity must be zero or greater")

    before_on_hand = inventory.on_hand
    before_verification_status = inventory.verification_status
    event_record = _create_event_record(
        db,
        event_type=EventType.INVENTORY_DISCREPANCY,
        payload=event,
        order_id=None,
        sku_id=sku_id,
        location_id=location_id,
        quantity=abs(new_quantity - before_on_hand),
        reported_by=str(event.get("reported_by") or "simulator"),
    )
    inventory.on_hand = new_quantity
    inventory.verification_status = InventoryVerificationStatus.NEEDS_COUNT
    explanation = (
        f"Cycle count updated SKU {sku_id} at bin {location_id} from {before_on_hand} to {new_quantity}. "
        "The bin was marked Needs Count and requires inventory-control review."
    )
    decision = _create_decision_record(
        db,
        event_record=event_record,
        order_id=None,
        sku_id=sku_id,
        decision_type=DecisionType.EXCEPTION,
        decision_mode=DecisionMode.APPROVAL_REQUIRED,
        status=DecisionStatus.PENDING,
        explanation=explanation,
        before_state={"on_hand": before_on_hand, "verification_status": before_verification_status.value},
        after_state={"on_hand": new_quantity, "verification_status": InventoryVerificationStatus.NEEDS_COUNT.value},
    )
    return {
        "event_id": event_record.id,
        "decision_id": decision.id,
        "event_type": EventType.INVENTORY_DISCREPANCY.value,
        "decision_mode": decision.decision_mode.name,
        "explanation": explanation,
        "sku_id": sku_id,
        "location_id": location_id,
    }


def _handle_item_missing(event: Mapping[str, Any], db: Session) -> dict[str, Any]:
    sku_id = _coerce_int(event.get("sku_id"))
    location_id = _coerce_int(event.get("location_id"))
    order_id = _coerce_int(event.get("order_id"))
    quantity_missing = max(1, _coerce_int(event.get("quantity_missing") or event.get("quantity") or 0))
    order = _get_order(db, order_id)

    event_record = _create_event_record(
        db,
        event_type=EventType.ITEM_MISSING,
        payload=event,
        order_id=order_id,
        sku_id=sku_id,
        location_id=location_id,
        quantity=quantity_missing,
        reported_by=str(event.get("reported_by") or "system"),
    )

    source_inventory = _get_inventory(db, sku_id, location_id)
    if source_inventory is None:
        source_inventory = Inventory(
            sku_id=sku_id,
            location_id=location_id,
            on_hand=0,
            allocated=0,
            picked=0,
            damaged=0,
            verification_status=InventoryVerificationStatus.VERIFIED,
            confidence_score=0,
        )
        db.add(source_inventory)
        db.flush()

    before_on_hand = source_inventory.on_hand
    before_verification = source_inventory.verification_status
    source_inventory.on_hand = max(0, source_inventory.on_hand - quantity_missing)
    source_inventory.verification_status = InventoryVerificationStatus.NEEDS_COUNT

    alternate_bins = _find_alternate_bins(db, sku_id, location_id)
    total_alternate = sum(_available_quantity(item) for item in alternate_bins)
    high_variance = quantity_missing > 5
    recurring_discrepancy = _has_recurring_discrepancy(db, sku_id, location_id)

    if order is not None and order.status in {OrderStatus.ALLOCATED, OrderStatus.PICKING, OrderStatus.READY_TO_PICK}:
        order_status = order.status
    else:
        order_status = OrderStatus.ALLOCATED if order is not None else OrderStatus.ALLOCATED

    if total_alternate >= quantity_missing and not high_variance and not recurring_discrepancy:
        decision_mode = DecisionMode.AUTO_EXECUTED
        decision_status = DecisionStatus.APPLIED
        if order is not None:
            order_status = order.status
        explanation = (
            f"Source bin {location_id} was marked as Needs Count after a {quantity_missing}-unit short pick. "
            f"Alternate verified stock exists, so the missing quantity was reallocated and the original bin was queued for a cycle count."
        )
    elif high_variance and total_alternate >= quantity_missing:
        decision_mode = DecisionMode.APPROVAL_REQUIRED
        decision_status = DecisionStatus.PENDING
        if order is not None:
            order_status = order.status
        explanation = (
            f"Source bin {location_id} was marked as Needs Count after a {quantity_missing}-unit short pick. "
            f"The variance exceeds the threshold and requires supervisor sign-off before inventory is zeroed and allocation is moved."
        )
    else:
        decision_mode = DecisionMode.ESCALATE
        decision_status = DecisionStatus.APPLIED
        if order is not None:
            order_status = order.status
        explanation = (
            f"Source bin {location_id} was marked as Needs Count after a {quantity_missing}-unit short pick. "
            f"No alternate bin remains or the discrepancy recurred, so inventory control must conduct a physical audit."
        )

    if order is not None:
        if order.status != order_status:
            order.status = order_status
        order.risk_status = "At Risk" if decision_mode == DecisionMode.APPROVAL_REQUIRED else ("Blocked" if decision_mode == DecisionMode.ESCALATE else "Safe")

    decision = _create_decision_record(
        db,
        event_record=event_record,
        order_id=order_id,
        sku_id=sku_id,
        decision_type=DecisionType.EXCEPTION,
        decision_mode=decision_mode,
        status=decision_status,
        explanation=explanation,
        before_state={"on_hand": before_on_hand, "verification_status": before_verification.value if before_verification else None},
        after_state={"on_hand": source_inventory.on_hand, "verification_status": source_inventory.verification_status.value},
    )

    return {
        "event_id": event_record.id,
        "decision_id": decision.id,
        "event_type": EventType.ITEM_MISSING.value,
        "decision_mode": decision_mode.name,
        "decision_mode_value": decision_mode.value,
        "order_status": order.status if order is not None else order_status,
        "explanation": explanation,
        "order_id": order_id,
        "sku_id": sku_id,
        "location_id": location_id,
    }


def _handle_qc_failed(event: Mapping[str, Any], db: Session) -> dict[str, Any]:
    order_id = _coerce_int(event.get("order_id"))
    sku_id = _coerce_int(event.get("sku_id"))
    quantity_inspected = max(0, _coerce_int(event.get("quantity_inspected") or 0))
    quantity_rejected = max(0, _coerce_int(event.get("quantity_rejected") or event.get("quantity") or 0))
    reason = str(event.get("failure_reason") or "Quality Failure")
    order = _get_order(db, order_id)

    event_record = _create_event_record(
        db,
        event_type=EventType.QC_FAILED,
        payload=event,
        order_id=order_id,
        sku_id=sku_id,
        location_id=_coerce_int(event.get("location_id")),
        quantity=quantity_rejected,
        reported_by=str(event.get("reported_by") or "qc_team"),
    )

    if quantity_rejected and sku_id is not None:
        for inventory in db.scalars(select(Inventory).where(Inventory.sku_id == sku_id)).all():
            inventory.damaged += quantity_rejected
            inventory.on_hand = max(0, inventory.on_hand - quantity_rejected)
            inventory.verification_status = InventoryVerificationStatus.QUARANTINED

    minor_admin_error = "Mismatch" in reason or "Quantity Mismatch" in reason or quantity_rejected <= max(1, quantity_inspected // 10)
    partial_split_required = quantity_rejected > 0 and quantity_rejected < quantity_inspected
    critical_defect = "safety" in reason.lower() or "critical" in reason.lower() or "whole batch" in reason.lower()

    if critical_defect:
        decision_mode = DecisionMode.ESCALATE
        decision_status = DecisionStatus.APPLIED
        order_status = OrderStatus.REWORK_REQUIRED
        explanation = (
            f"QC failed on {quantity_rejected} units for SKU {sku_id}. "
            f"The rejection was classified as a critical quality hold; all matching orders were frozen and a quality audit was triggered."
        )
    elif minor_admin_error:
        decision_mode = DecisionMode.AUTO_EXECUTED
        decision_status = DecisionStatus.APPLIED
        order_status = OrderStatus.EXCEPTION_REVIEW
        explanation = (
            f"QC failed on {quantity_rejected} units for SKU {sku_id} due to {reason}. "
            f"The discrepancy was resolved as an administrative count issue and the order was returned to QC review."
        )
    elif partial_split_required:
        decision_mode = DecisionMode.APPROVAL_REQUIRED
        decision_status = DecisionStatus.PENDING
        order_status = OrderStatus.REWORK_REQUIRED
        explanation = (
            f"QC failed on {quantity_rejected} units for SKU {sku_id} due to {reason}. "
            f"The order requires supervisor approval to split fulfillment and hold rejected items."
        )
    else:
        decision_mode = DecisionMode.APPROVAL_REQUIRED
        decision_status = DecisionStatus.PENDING
        order_status = OrderStatus.EXCEPTION_REVIEW
        explanation = (
            f"QC failed on {quantity_rejected} units for SKU {sku_id} due to {reason}. "
            f"Supervisor approval is required before re-queueing the order or adjusting inventory."
        )

    if order is not None:
        order.status = order_status
        order.risk_status = "Blocked" if decision_mode == DecisionMode.ESCALATE else ("At Risk" if decision_mode == DecisionMode.APPROVAL_REQUIRED else "Safe")

    decision = _create_decision_record(
        db,
        event_record=event_record,
        order_id=order_id,
        sku_id=sku_id,
        decision_type=DecisionType.EXCEPTION,
        decision_mode=decision_mode,
        status=decision_status,
        explanation=explanation,
        before_state={"quantity_inspected": quantity_inspected, "quantity_rejected": quantity_rejected, "status": order.status if order is not None else None},
        after_state={"status": order_status, "risk_status": order.risk_status if order is not None else None},
    )

    return {
        "event_id": event_record.id,
        "decision_id": decision.id,
        "event_type": EventType.QC_FAILED.value,
        "decision_mode": decision_mode.name,
        "decision_mode_value": decision_mode.value,
        "order_status": order.status if order is not None else order_status,
        "explanation": explanation,
        "order_id": order_id,
        "sku_id": sku_id,
        "quantity_rejected": quantity_rejected,
    }


def _create_event_record(
    db: Session,
    *,
    event_type: EventType,
    payload: Mapping[str, Any],
    order_id: int | None,
    sku_id: int | None,
    location_id: int | None,
    quantity: int | None,
    reported_by: str,
) -> Event:
    event_record = Event(
        event_type=event_type,
        order_id=order_id,
        sku_id=sku_id,
        location_id=location_id,
        quantity=quantity,
        payload=json.dumps(_json_safe(payload), sort_keys=True),
        reported_by=reported_by,
    )
    db.add(event_record)
    db.flush()
    return event_record


def _create_decision_record(
    db: Session,
    *,
    event_record: Event,
    order_id: int | None,
    sku_id: int | None,
    decision_type: DecisionType,
    decision_mode: DecisionMode,
    status: DecisionStatus,
    explanation: str,
    before_state: Mapping[str, Any] | None,
    after_state: Mapping[str, Any] | None,
) -> Decision:
    decision_record = Decision(
        event_id=event_record.id,
        order_id=order_id,
        sku_id=sku_id,
        decision_type=decision_type,
        decision_mode=decision_mode,
        status=status,
        explanation=explanation,
        before_state=json.dumps(_json_safe(before_state or {}), sort_keys=True),
        after_state=json.dumps(_json_safe(after_state or {}), sort_keys=True),
        actor=event_record.reported_by or "system",
    )
    db.add(decision_record)
    db.flush()
    return decision_record


def _get_order(db: Session, order_id: int | None) -> Order | None:
    if order_id is None:
        return None
    return db.get(Order, order_id)


def _get_inventory(db: Session, sku_id: int | None, location_id: int | None) -> Inventory | None:
    if sku_id is None or location_id is None:
        return None
    return db.scalar(select(Inventory).where(Inventory.sku_id == sku_id, Inventory.location_id == location_id))


def _find_alternate_bins(db: Session, sku_id: int, excluded_location_id: int | None) -> list[Inventory]:
    query = select(Inventory).where(Inventory.sku_id == sku_id, Inventory.verification_status != InventoryVerificationStatus.QUARANTINED)
    if excluded_location_id is not None:
        query = query.where(Inventory.location_id != excluded_location_id)
    inventories = list(db.scalars(query).all())
    return sorted(inventories, key=_bin_priority_key, reverse=True)


def _bin_priority_key(record: Inventory) -> tuple[int, int, int]:
    status_rank = {InventoryVerificationStatus.VERIFIED: 2, InventoryVerificationStatus.NEEDS_COUNT: 1, InventoryVerificationStatus.QUARANTINED: 0}
    return (status_rank.get(record.verification_status, 0), record.confidence_score, _available_quantity(record))


def _available_quantity(record: Inventory) -> int:
    return max(0, record.on_hand - record.allocated - record.damaged)


def _has_recurring_discrepancy(db: Session, sku_id: int, location_id: int | None) -> bool:
    if location_id is None:
        return False
    event_count = db.scalar(
        select(func.count(Event.id)).where(
            Event.sku_id == sku_id,
            Event.location_id == location_id,
            Event.event_type.in_([EventType.ITEM_MISSING, EventType.ITEM_DAMAGED]),
        )
    )
    return bool(event_count and event_count >= 2)


def _normalize_event_type(value: Any) -> EventType:
    if isinstance(value, EventType):
        return value
    if isinstance(value, str):
        normalized = value.strip().upper()
        for event_type in EventType:
            if event_type.value == value or event_type.name == normalized or event_type.value.upper() == normalized:
                return event_type
    raise ValueError(f"Unsupported event type: {value!r}")


def _coerce_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _json_safe(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if hasattr(value, "value") and not isinstance(value, (str, int, float, bool)) and value.__class__.__module__ != "datetime":
        return value.value
    return value
