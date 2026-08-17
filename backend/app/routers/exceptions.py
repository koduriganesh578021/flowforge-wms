import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.entities import Decision, Event
from app.models.enums import DecisionType


router = APIRouter(prefix="/exceptions")


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
        "decision_mode": decision.decision_mode.name,
        "explanation": decision.explanation,
        "timestamp": event.created_at,
        "status": decision.status.value,
    }
