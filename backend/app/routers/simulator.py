from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Inventory, Order, OrderItem
from app.models.enums import OrderStatus
from app.services.event_engine import process_event


router = APIRouter(prefix="/api/simulator")


class DamageStockRequest(BaseModel):
    sku_id: int
    location_id: int
    quantity: int = Field(gt=0)


class UpdateCountRequest(BaseModel):
    sku_id: int
    location_id: int
    new_quantity: int = Field(ge=0)


class FailQCRequest(BaseModel):
    order_id: int
    sku_id: int


@router.post("/damage-stock")
def damage_stock(request: DamageStockRequest, db: Session = Depends(get_db)) -> dict:
    inventory = _get_inventory(db, request.sku_id, request.location_id)
    if inventory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    if request.quantity > inventory.on_hand:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Damage quantity exceeds on-hand inventory")

    decision = process_event({
        "event_type": "ITEM_DAMAGED", "sku_id": request.sku_id, "location_id": request.location_id,
        "quantity": request.quantity, "reported_by": "simulator",
    }, db)
    db.refresh(inventory)
    return {"inventory": _inventory_response(inventory), "decision": decision}


@router.post("/update-count")
def update_count(request: UpdateCountRequest, db: Session = Depends(get_db)) -> dict:
    inventory = _get_inventory(db, request.sku_id, request.location_id)
    if inventory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")

    decision = process_event({
        "event_type": "INVENTORY_DISCREPANCY", "sku_id": request.sku_id,
        "location_id": request.location_id, "new_quantity": request.new_quantity,
        "reported_by": "simulator",
    }, db)
    db.refresh(inventory)
    return {"inventory": _inventory_response(inventory), "decision": decision}


@router.post("/fail-qc")
def fail_qc(request: FailQCRequest, db: Session = Depends(get_db)) -> dict:
    order = db.get(Order, request.order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status == OrderStatus.DISPATCHED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot fail QC for a dispatched order")
    order_item = db.scalar(select(OrderItem).where(
        OrderItem.order_id == request.order_id, OrderItem.sku_id == request.sku_id,
    ))
    if order_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found for this order and SKU")

    order_item.fulfillment_status = "FAILED"
    quantity_inspected = max(order_item.quantity_picked, 1)
    decision = process_event({
        "event_type": "QC_FAILED", "order_id": request.order_id, "sku_id": request.sku_id,
        "quantity_inspected": quantity_inspected, "quantity_rejected": 1,
        "failure_reason": "Simulator quality failure", "reported_by": "simulator",
    }, db)
    db.refresh(order_item)
    db.refresh(order)
    return {
        "order": {"id": order.id, "status": order.status.value, "risk_status": order.risk_status},
        "order_item": {
            "id": order_item.id, "order_id": order_item.order_id, "sku_id": order_item.sku_id,
            "inspection_status": order_item.fulfillment_status,
        },
        "decision": decision,
    }


def _get_inventory(db: Session, sku_id: int, location_id: int) -> Inventory | None:
    return db.scalar(select(Inventory).where(
        Inventory.sku_id == sku_id, Inventory.location_id == location_id,
    ))


def _inventory_response(inventory: Inventory) -> dict:
    return {
        "id": inventory.id, "sku_id": inventory.sku_id, "location_id": inventory.location_id,
        "on_hand": inventory.on_hand, "allocated": inventory.allocated, "picked": inventory.picked,
        "damaged": inventory.damaged, "verification_status": inventory.verification_status.value,
    }
