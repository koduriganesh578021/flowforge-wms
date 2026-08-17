import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.entities import Decision, Order, OrderItem
from app.models.enums import DecisionMode, DecisionStatus, DecisionType
from app.schemas.orders import (
    AllocateResponse,
    AllocationDecisionResponse,
    AllocationOrderResponse,
    OrderDetail,
    OrderItemDetail,
    OrderListItem,
    PickTaskDetail,
    PrioritizeResponse,
    PriorityExplanation,
    ShortageResponse,
)
from app.services.allocation_engine import ELIGIBLE_STATUSES, allocate_eligible_orders
from app.services.priority_engine import evaluate_priority


router = APIRouter(prefix="/orders")


@router.get("", response_model=list[OrderListItem])
def list_orders(db: Session = Depends(get_db)) -> list[Order]:
    return list(db.scalars(select(Order).order_by(Order.id)))


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(order_id: int, db: Session = Depends(get_db)) -> OrderDetail:
    order = _order_with_details(db, order_id)
    priority_decision = db.scalar(
        select(Decision).where(
            Decision.order_id == order_id, Decision.decision_type == DecisionType.PRIORITIZATION,
        ).order_by(Decision.created_at.desc(), Decision.id.desc())
    )
    explanation = _priority_explanation(order, priority_decision)
    return OrderDetail(
        id=order.id, order_code=order.order_code, customer_name=order.customer_name, status=order.status,
        priority_score=order.priority_score, priority_label=order.priority_label, risk_status=order.risk_status,
        due_at=order.due_at,
        items=[_item_detail(item) for item in order.items],
        pick_tasks=[PickTaskDetail.model_validate(task) for item in order.items for task in item.pick_tasks],
        priority_explanation=explanation,
    )


@router.post("/{order_id}/prioritize", response_model=PrioritizeResponse)
def prioritize_order(order_id: int, db: Session = Depends(get_db)) -> PrioritizeResponse:
    order = _get_order(db, order_id)
    assessment = evaluate_priority(order)
    before_state = json.dumps({
        "priority_score": order.priority_score, "priority_label": order.priority_label, "risk_status": order.risk_status,
    })
    order.priority_score, order.priority_label, order.risk_status = assessment.score, assessment.label, assessment.risk_flag
    decision = Decision(
        order_id=order.id, decision_type=DecisionType.PRIORITIZATION,
        decision_mode=DecisionMode.AUTO_EXECUTED, status=DecisionStatus.APPLIED,
        explanation="; ".join(assessment.reasons) or "No priority signals matched.",
        before_state=before_state,
        after_state=json.dumps({"priority_score": assessment.score, "priority_label": assessment.label, "risk_status": assessment.risk_flag}),
    )
    db.add(decision)
    db.commit()
    db.refresh(order)
    db.refresh(decision)
    return PrioritizeResponse(order_id=order.id, score=assessment.score, label=assessment.label,
                              risk_flag=assessment.risk_flag, reasons=assessment.reasons, decision_id=decision.id)


@router.post("/{order_id}/allocate", response_model=AllocateResponse)
def allocate_order(order_id: int, db: Session = Depends(get_db)) -> AllocateResponse:
    order = _get_order(db, order_id)
    if order.status not in ELIGIBLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order is not eligible for allocation")
    # ``get`` starts a read transaction; finish it before the engine owns the allocation transaction.
    db.rollback()
    result = allocate_eligible_orders(db)
    requested_result = next((item for item in result.orders if item.order_id == order_id), None)
    if requested_result is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order is not eligible for allocation")
    return AllocateResponse(
        order=AllocationOrderResponse.model_validate(requested_result),
        unresolved_shortages=[ShortageResponse.model_validate(item) for item in result.unresolved_shortages],
        decisions_created=[AllocationDecisionResponse.model_validate(item) for item in result.decisions_created],
        confidence_recommendations=result.confidence_recommendations,
    )


def _get_order(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _order_with_details(db: Session, order_id: int) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).options(
        selectinload(Order.items).selectinload(OrderItem.pick_tasks),
    ))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _item_detail(item: OrderItem) -> OrderItemDetail:
    return OrderItemDetail(
        id=item.id, sku_id=item.sku_id, quantity_requested=item.quantity_requested,
        quantity_allocated=item.quantity_allocated, quantity_picked=item.quantity_picked,
        quantity_dispatched=item.quantity_dispatched,
        unfulfilled_at_allocation=item.quantity_requested - item.quantity_allocated,
        remaining_to_ship=item.quantity_requested - item.quantity_dispatched,
    )


def _priority_explanation(order: Order, decision: Decision | None) -> PriorityExplanation | None:
    if order.priority_score is None or decision is None:
        return None
    return PriorityExplanation(
        score=order.priority_score, label=order.priority_label or "Normal", risk_flag=order.risk_status or "Unknown",
        reasons=[reason for reason in decision.explanation.split("; ") if reason],
    )
