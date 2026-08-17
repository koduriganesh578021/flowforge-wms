from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.services.reorder_engine import assess_inventory


router = APIRouter(prefix="/inventory")


@router.get("")
def list_inventory(db: Session = Depends(get_db)) -> dict:
    assessments = assess_inventory(db)
    return {"items": [_overview_item(assessment) for assessment in assessments]}


@router.get("/{sku_id}")
def get_inventory_sku(sku_id: int, db: Session = Depends(get_db)) -> dict:
    assessment = next((item for item in assess_inventory(db) if item.sku_id == sku_id), None)
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
    # Reloading product detail is unnecessary: the returned assessment includes
    # all aggregate facts, while its bins are retrieved from the same session.
    from app.models.entities import Inventory, Product
    product = db.scalar(select(Product).where(Product.id == sku_id).options(
        selectinload(Product.inventory_records).selectinload(Inventory.location),
    ))
    return {**assessment.payload(), "bins": [
        {
            "location_id": record.location_id, "location_code": record.location.location_code,
            "on_hand": record.on_hand, "allocated": record.allocated, "damaged": record.damaged,
            "available_stock": 0 if record.verification_status.value == "quarantined" else record.on_hand - record.allocated - record.damaged,
            "verification_status": record.verification_status.value, "confidence_score": record.confidence_score,
            "last_verified_at": record.last_verified_at,
        }
        for record in product.inventory_records
    ]}


def _overview_item(assessment) -> dict:
    return assessment.payload()
