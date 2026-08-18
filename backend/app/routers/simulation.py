from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.simulation import SimulateEventRequest
from app.services.event_engine import DuplicateEventError
from app.services.simulation_service import simulate_event

router = APIRouter(prefix="/simulate")


@router.post("/event")
def simulate(request: SimulateEventRequest, db: Session = Depends(get_db)) -> dict:
    try:
        return simulate_event(db, request)
    except DuplicateEventError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
