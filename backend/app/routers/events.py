from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.event_engine import DuplicateEventError, process_event


router = APIRouter(prefix="/events")


@router.post("")
def process_exception_event(event: dict, db: Session = Depends(get_db)) -> dict:
    try:
        return process_event(event, db)
    except DuplicateEventError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
