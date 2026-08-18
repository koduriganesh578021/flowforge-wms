import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.entities import Decision, Event, Inventory, Order
from app.models.enums import DecisionStatus, DecisionType, EventType, InventoryVerificationStatus, OrderStatus


router = APIRouter(prefix="/exceptions")


class ResolveExceptionRequest(BaseModel):
    actor: str = "operator"
    note: str | None = Field(default=None, max_length=500)


@router.get("")
def list_exceptions(db: Session = Depends(get_db)) -> list[dict]:
    events = db.scalars(
        select(Event)
        .join(Event.decisions)
        .where(Decision.decision_type == DecisionType.EXCEPTION)
        .options(selectinload(Event.decisions))
        .order_by(Event.created_at.desc(), Event.id.desc())
    ).unique().all()
    return [_exception_response(event) for event in events]


@router.get("/{event_id}")
def get_exception(event_id: int, db: Session = Depends(get_db)) -> dict:
    event = db.scalar(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.decisions))
    )
    if event is None or not any(decision.decision_type == DecisionType.EXCEPTION for decision in event.decisions):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found")
    return _exception_response(event)


@router.post("/{event_id}/resolve")
def resolve_exception(
    event_id: int,
    request: ResolveExceptionRequest,
    db: Session = Depends(get_db),
) -> dict:
    event = db.scalar(
        select(Event).where(Event.id == event_id).options(selectinload(Event.decisions))
    )
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found")
    decision = next((item for item in event.decisions if item.decision_type == DecisionType.EXCEPTION), None)
    if decision is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found")
    if decision.status == DecisionStatus.RESOLVED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Exception has already been resolved")

    decision.status = DecisionStatus.RESOLVED
    decision.actor = request.actor
    payload = json.loads(event.payload) if event.payload else {}
    payload["resolution_note"] = request.note
    payload["resolved_by"] = request.actor
    payload["resolved_at"] = datetime.now(timezone.utc).isoformat()
    event.payload = json.dumps(payload, sort_keys=True)

    if event.event_type == EventType.INVENTORY_DISCREPANCY:
        inventory = db.scalar(select(Inventory).where(
            Inventory.sku_id == event.sku_id,
            Inventory.location_id == event.location_id,
        ))
        if inventory is not None:
            inventory.verification_status = InventoryVerificationStatus.VERIFIED
            inventory.confidence_score = 100
            inventory.last_verified_at = datetime.now(timezone.utc)

    order_id = decision.order_id if decision.order_id is not None else event.order_id
    order = db.get(Order, order_id) if order_id is not None else None
    has_pending_exception = order is not None and db.scalar(select(Decision.id).where(
        Decision.order_id == order.id,
        Decision.decision_type == DecisionType.EXCEPTION,
        Decision.status == DecisionStatus.PENDING,
        Decision.id != decision.id,
    )) is not None
    if order is not None and not has_pending_exception:
        restored_status = {
            OrderStatus.EXCEPTION_REVIEW: OrderStatus.READY_TO_PICK,
            OrderStatus.REWORK_REQUIRED: OrderStatus.QUALITY_CHECK,
        }.get(order.status)
        if restored_status is not None:
            order.status = restored_status
            order.risk_status = "Safe"
            order.stage_entered_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(event)
    db.refresh(decision)
    return _exception_response(event)


def _exception_response(event: Event) -> dict:
    decision = next(decision for decision in event.decisions if decision.decision_type == DecisionType.EXCEPTION)
    payload = json.loads(event.payload) if event.payload else {}
    return {
        "id": event.id,
        "event_type": event.event_type.value,
        "sku_id": event.sku_id,
        "quantity": event.quantity,
        "location_id": event.location_id,
        "order_id": event.order_id,
        "notes": payload.get("notes"),
        "resolution_note": payload.get("resolution_note"),
        "decision_mode": decision.decision_mode.name,
        "explanation": decision.explanation,
        "timestamp": event.created_at,
        "status": decision.status.value,
    }
