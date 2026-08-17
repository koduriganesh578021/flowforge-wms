from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.bottleneck_engine import get_bottlenecks, get_dashboard_summary


router = APIRouter()


@router.get("/analytics/bottlenecks")
def list_bottlenecks(db: Session = Depends(get_db)) -> list[dict]:
    return get_bottlenecks(db)


@router.get("/dashboard")
def dashboard_summary(db: Session = Depends(get_db)) -> dict:
    return get_dashboard_summary(db)
