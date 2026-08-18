import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.entities import Decision, Event, Inventory, Order, OrderItem
from app.models.enums import DecisionMode, DecisionStatus, DecisionType, InventoryVerificationStatus, OrderStatus
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
    TransitionRequest,
    WorkflowOrderResponse,
)
from app.schemas.validation_errors import AllocationBlockReason, AllocationBlockResponse
from app.services.allocation_engine import ELIGIBLE_STATUSES, allocate_eligible_orders
from app.services.blocking import OrderBlockedError
from app.services.order_workflow import confirm_order_picked, dispatch_order, transition_order
from app.services.priority_engine import evaluate_priority


router = APIRouter(prefix="/api/orders")


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
    try:
        order = _get_order(db, order_id)
        existing_decision = db.scalar(select(Decision).where(
            Decision.order_id == order.id,
            Decision.decision_type == DecisionType.PRIORITIZATION,
        ).order_by(Decision.created_at.desc(), Decision.id.desc()))
        if order.priority_score is not None and existing_decision is not None:
            return PrioritizeResponse(
                order_id=order.id, score=order.priority_score, label=order.priority_label or "Normal",
                risk_flag=order.risk_status or "Unknown",
                reasons=[reason for reason in existing_decision.explanation.split("; ") if reason],
                decision_id=existing_decision.id,
            )
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
        if order.status == OrderStatus.CREATED:
            transition_order(db, order.id, OrderStatus.PRIORITIZED)
        else:
            db.commit()
        db.refresh(order)
        db.refresh(decision)
        return PrioritizeResponse(order_id=order.id, score=assessment.score, label=assessment.label,
                                  risk_flag=assessment.risk_flag, reasons=assessment.reasons, decision_id=decision.id)
    except HTTPException:
        db.rollback()
        raise
    except (ValueError, SQLAlchemyError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Priority check cannot be completed: {exc}",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority check cannot be completed due to an unexpected processing error.",
        ) from exc


@router.post(
    "/{order_id}/allocate",
    response_model=AllocateResponse,
    responses={422: {"model": AllocationBlockResponse, "description": "Allocation is blocked by an exception or shortage."}},
)
def allocate_order(order_id: int, db: Session = Depends(get_db)) -> AllocateResponse | JSONResponse:
    try:
        order = _get_order(db, order_id)
        if order.status not in ELIGIBLE_STATUSES:
            raise OrderBlockedError(_allocation_block_response(db, order))
        if order.priority_score is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Priority must be calculated before inventory allocation.",
            )
        # ``get`` starts a read transaction; finish it before the engine owns the allocation transaction.
        db.rollback()
        result = allocate_eligible_orders(db)
        requested_result = next((item for item in result.orders if item.order_id == order_id), None)
        if requested_result is None:
            raise OrderBlockedError(_allocation_block_response(db, order))
        return AllocateResponse(
            order=AllocationOrderResponse.model_validate(requested_result),
            unresolved_shortages=[ShortageResponse.model_validate(item) for item in result.unresolved_shortages],
            decisions_created=[AllocationDecisionResponse.model_validate(item) for item in result.decisions_created],
            confidence_recommendations=result.confidence_recommendations,
        )
    except HTTPException:
        db.rollback()
        raise
    except OrderBlockedError as exc:
        db.rollback()
        return _blocked_response(exc)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Allocation cannot be completed because the warehouse data is inconsistent: {exc}",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allocation cannot be completed because inventory changes could not be saved. Please try again.",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allocation cannot be completed due to an unexpected processing error.",
        ) from exc


@router.post("/{order_id}/transition", response_model=WorkflowOrderResponse, responses={422: {"model": AllocationBlockResponse}})
def transition_order_endpoint(order_id: int, request: TransitionRequest, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: transition_order(db, order_id, request.new_status, request.actor), db)


@router.post("/{order_id}/start-picking", response_model=WorkflowOrderResponse)
def start_picking(order_id: int, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: transition_order(db, order_id, OrderStatus.PICKING), db)


@router.post("/{order_id}/confirm-picked", response_model=WorkflowOrderResponse)
def confirm_picked(order_id: int, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: confirm_order_picked(db, order_id), db)


@router.post("/{order_id}/confirm-packed", response_model=WorkflowOrderResponse)
def confirm_packed(order_id: int, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: transition_order(db, order_id, OrderStatus.QUALITY_CHECK), db)


@router.post("/{order_id}/qc-pass", response_model=WorkflowOrderResponse)
def qc_pass(order_id: int, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: transition_order(db, order_id, OrderStatus.READY_TO_DISPATCH), db)


@router.post("/{order_id}/qc-fail", response_model=WorkflowOrderResponse)
def qc_fail(order_id: int, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: transition_order(db, order_id, OrderStatus.REWORK_REQUIRED), db)


@router.post("/{order_id}/dispatch", response_model=WorkflowOrderResponse)
def dispatch(order_id: int, db: Session = Depends(get_db)) -> Order | JSONResponse:
    return _workflow_response(lambda: dispatch_order(db, order_id), db)


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


def _allocation_block_response(db: Session, order: Order) -> AllocationBlockResponse:
    if order.status in {OrderStatus.EXCEPTION_REVIEW, OrderStatus.REWORK_REQUIRED}:
        decision = db.scalar(
            select(Decision).where(
                Decision.order_id == order.id,
                Decision.decision_type == DecisionType.EXCEPTION,
                Decision.status == DecisionStatus.PENDING,
            ).order_by(Decision.created_at.desc(), Decision.id.desc())
        )
        event = db.get(Event, decision.event_id) if decision and decision.event_id else None
        return AllocationBlockResponse(order_id=order.id, reasons=[AllocationBlockReason(
            reason_code="EXCEPTION_REVIEW_ACTIVE",
            message="Cannot allocate while this order is under exception review.",
            details={
                "status": order.status.value,
                "exception_type": event.event_type.value if event else order.status.value,
                "exception_event_id": decision.event_id if decision else None,
                "decision_id": decision.id if decision else None,
            },
        )])

    reasons = []
    for item in order.items:
        if item.quantity_requested <= item.quantity_allocated:
            continue
        inventories = list(db.scalars(select(Inventory).where(Inventory.sku_id == item.sku_id)))
        available = sum(
            max(0, inventory.on_hand - inventory.allocated - inventory.damaged)
            for inventory in inventories
            if inventory.verification_status != InventoryVerificationStatus.QUARANTINED
        )
        reasons.append(AllocationBlockReason(
            reason_code="INSUFFICIENT_INVENTORY",
            message=f"Cannot allocate SKU {item.sku_id}: add inventory or reduce the order quantity.",
            details={
                "status": order.status.value,
                "sku_id": item.sku_id,
                "quantity_requested": item.quantity_requested,
                "quantity_allocated": item.quantity_allocated,
                "quantity_missing": item.quantity_requested - item.quantity_allocated,
                "quantity_available": available,
                "bin_ids": [inventory.location_id for inventory in inventories],
            },
        ))
    if not reasons:
        reasons.append(AllocationBlockReason(
            reason_code="ORDER_STATUS_BLOCKED",
            message="Cannot allocate this order in its current status.",
            details={"status": order.status.value},
        ))
    return AllocationBlockResponse(order_id=order.id, reasons=reasons)


def _workflow_response(action, db: Session) -> Order | JSONResponse:
    try:
        return action()
    except OrderBlockedError as exc:
        db.rollback()
        return _blocked_response(exc)


def _blocked_response(exc: OrderBlockedError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=exc.response.model_dump(mode="json"))
