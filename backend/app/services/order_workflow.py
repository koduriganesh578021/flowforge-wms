"""Order status transitions and one-time dispatch inventory accounting."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Inventory, Order, OrderItem, PickTask
from app.models.enums import OrderStatus, PickTaskStatus


ORDER_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.CREATED: {OrderStatus.PRIORITIZED, OrderStatus.CANCELLED},
    OrderStatus.PRIORITIZED: {OrderStatus.AWAITING_ALLOCATION, OrderStatus.ALLOCATED, OrderStatus.CANCELLED},
    OrderStatus.AWAITING_ALLOCATION: {OrderStatus.ALLOCATED, OrderStatus.PARTIALLY_ALLOCATED, OrderStatus.CANCELLED},
    OrderStatus.PARTIALLY_ALLOCATED: {OrderStatus.ALLOCATED, OrderStatus.AWAITING_STOCK, OrderStatus.BACKORDERED, OrderStatus.CANCELLED},
    OrderStatus.ALLOCATED: {OrderStatus.READY_TO_PICK, OrderStatus.CANCELLED},
    OrderStatus.READY_TO_PICK: {OrderStatus.PICKING, OrderStatus.CANCELLED},
    OrderStatus.PICKING: {OrderStatus.PICKED, OrderStatus.EXCEPTION_REVIEW, OrderStatus.CANCELLED},
    OrderStatus.PICKED: {OrderStatus.PACKING, OrderStatus.CANCELLED},
    OrderStatus.PACKING: {OrderStatus.QUALITY_CHECK, OrderStatus.CANCELLED},
    OrderStatus.QUALITY_CHECK: {OrderStatus.READY_TO_DISPATCH, OrderStatus.REWORK_REQUIRED, OrderStatus.EXCEPTION_REVIEW, OrderStatus.CANCELLED},
    # Existing demo data uses this legacy value; it behaves like Quality Check.
    OrderStatus.QC: {OrderStatus.READY_TO_DISPATCH, OrderStatus.REWORK_REQUIRED, OrderStatus.EXCEPTION_REVIEW, OrderStatus.CANCELLED},
    OrderStatus.READY_TO_DISPATCH: {OrderStatus.DISPATCHED, OrderStatus.CANCELLED},
    OrderStatus.AWAITING_STOCK: {OrderStatus.ALLOCATED, OrderStatus.BACKORDERED, OrderStatus.CANCELLED},
    OrderStatus.BACKORDERED: {OrderStatus.ALLOCATED, OrderStatus.AWAITING_STOCK, OrderStatus.CANCELLED},
    OrderStatus.EXCEPTION_REVIEW: {OrderStatus.REWORK_REQUIRED, OrderStatus.ALLOCATED, OrderStatus.READY_TO_PICK, OrderStatus.CANCELLED},
    OrderStatus.REWORK_REQUIRED: {OrderStatus.QUALITY_CHECK, OrderStatus.CANCELLED},
    OrderStatus.DISPATCHED: set(),
    OrderStatus.CANCELLED: set(),
}


def can_transition(current_status: OrderStatus, new_status: OrderStatus) -> bool:
    return new_status in ORDER_TRANSITIONS[current_status]


def transition_order(db: Session, order_id: int, new_status: OrderStatus, actor: str = "system") -> Order:
    """Persist a valid state transition. ``actor`` is retained for future audit logging."""
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if not can_transition(order.status, new_status):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid status transition")
    order.status = new_status
    order.stage_entered_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


def confirm_order_picked(db: Session, order_id: int, actor: str = "system") -> Order:
    order = _order_with_pick_tasks(db, order_id)
    if order.status != OrderStatus.PICKING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order must be Picking before confirmation")

    for item in order.items:
        if item.quantity_allocated < item.quantity_requested:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order contains an incompletely allocated line")
        remaining = item.quantity_allocated
        tasks = sorted(item.pick_tasks, key=lambda task: (task.sequence is None, task.sequence, task.id))
        if not tasks:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order line has no pick tasks")
        for task in tasks:
            confirmed = min(remaining, task.quantity_required)
            task.quantity_confirmed = confirmed
            task.status = PickTaskStatus.PICKED
            remaining -= confirmed
        if remaining:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pick tasks do not cover the allocated quantity")
        item.quantity_picked = item.quantity_allocated

    # All mutations belong to the same transaction as the state transition.
    order.status = OrderStatus.PICKED
    order.stage_entered_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


def dispatch_order(db: Session, order_id: int, actor: str = "system") -> Order:
    order = _order_with_pick_tasks(db, order_id)
    if order.status != OrderStatus.READY_TO_DISPATCH:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order must be Ready to Dispatch")

    for item in order.items:
        if item.quantity_picked != item.quantity_requested or item.quantity_allocated != item.quantity_requested:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="All order lines must be fully allocated and picked before dispatch")
        if item.quantity_dispatched:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order line has already been dispatched")

        tasks = item.pick_tasks
        if sum(task.quantity_confirmed for task in tasks) != item.quantity_picked:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Confirmed pick quantities must match the picked quantity")
        for task in tasks:
            inventory = db.scalar(select(Inventory).where(
                Inventory.sku_id == item.sku_id, Inventory.location_id == task.source_location_id,
            ))
            if inventory is None or inventory.on_hand < task.quantity_confirmed or inventory.allocated < task.quantity_confirmed:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient committed inventory for dispatch")
            # Allocation reserves stock but does not reduce on_hand. Dispatch consumes it once,
            # clearing the corresponding reservation so a later operation cannot deduct it again.
            inventory.on_hand -= task.quantity_confirmed
            inventory.allocated -= task.quantity_confirmed
        item.quantity_dispatched = item.quantity_picked

    order.status = OrderStatus.DISPATCHED
    order.stage_entered_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


def _order_with_pick_tasks(db: Session, order_id: int) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).options(
        selectinload(Order.items).selectinload(OrderItem.pick_tasks),
    ))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
