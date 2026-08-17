"""Explainable inventory-risk and replenishment recommendations."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Decision, Inventory, Order, OrderItem, Product
from app.models.enums import (
    DecisionMode,
    DecisionStatus,
    DecisionType,
    InventoryVerificationStatus,
    OrderStatus,
)


# These are the only terminal states represented in the current order workflow.
OPEN_ORDER_STATUSES = tuple(status for status in OrderStatus if status not in {
    OrderStatus.CANCELLED, OrderStatus.DISPATCHED,
})


@dataclass
class ReorderAssessment:
    sku_id: int
    sku_code: str
    name: str
    on_hand: int
    allocated: int
    damaged: int
    available_stock: int
    reorder_point: int | None
    demand_from_open_orders: int
    projected_stock: int
    target_stock: int | None
    suggested_reorder: int | None
    status: str
    explanation: str
    data_quality_issue: str | None = None
    decision_id: int | None = None

    def payload(self) -> dict:
        return asdict(self)


def assess_inventory(session: Session, *, create_decisions: bool = True, actor: str = "system") -> list[ReorderAssessment]:
    """Calculate SKU-level inventory risk and optionally persist pending actions.

    Quarantined bins never contribute to available stock.  Demand is intentionally
    the unallocated part of each active line, preventing allocated demand from
    being subtracted twice.
    """
    products = list(session.scalars(select(Product).options(
        selectinload(Product.inventory_records).selectinload(Inventory.location),
    ).order_by(Product.sku_code)))
    demand_by_sku = _unmet_open_demand(session)
    assessments = [_assessment(product, demand_by_sku.get(product.id, 0)) for product in products]

    if create_decisions:
        _attach_reorder_decisions(session, assessments, actor)
        session.commit()
    return assessments


def assess_sku(session: Session, sku_id: int, *, create_decisions: bool = True) -> ReorderAssessment | None:
    """Return one SKU assessment while preserving the same duplicate guard."""
    assessments = assess_inventory(session, create_decisions=create_decisions)
    return next((assessment for assessment in assessments if assessment.sku_id == sku_id), None)


def _unmet_open_demand(session: Session) -> dict[int, int]:
    lines = session.scalars(select(OrderItem).join(Order).where(
        Order.status.in_(OPEN_ORDER_STATUSES)
    ))
    demand: dict[int, int] = {}
    for line in lines:
        unmet = max(0, line.quantity_requested - line.quantity_allocated)
        demand[line.sku_id] = demand.get(line.sku_id, 0) + unmet
    return demand


def _assessment(product: Product, demand: int) -> ReorderAssessment:
    usable_bins = [record for record in product.inventory_records
                   if record.verification_status != InventoryVerificationStatus.QUARANTINED]
    on_hand = sum(record.on_hand for record in usable_bins)
    allocated = sum(record.allocated for record in usable_bins)
    damaged = sum(record.damaged for record in usable_bins)
    available = on_hand - allocated - damaged
    reorder_point = product.reorder_point
    if reorder_point is None or reorder_point < 0:
        issue = "Reorder point is missing or negative; replenishment recommendation requires data correction."
        return ReorderAssessment(product.id, product.sku_code, product.name, on_hand, allocated, damaged,
                                 available, reorder_point, demand, available - demand, None, None,
                                 "Data Quality Issue", issue, issue)

    projected = available - demand
    target = 2 * reorder_point
    suggested = max(0, target - projected)
    if projected <= 0:
        risk, explanation = "Stockout", (
            f"{product.sku_code} is projected to run out: available stock ({available}) cannot cover "
            f"{demand} units of open demand, a projected shortfall of {abs(projected)} units. "
            f"Immediate reorder of {suggested} units required. Review open orders for reallocation or backorder before dispatch."
        )
    elif projected <= reorder_point:
        risk, explanation = "High Risk", (
            f"{product.sku_code} is approaching its reorder threshold: projected stock of {projected} units "
            f"will fall below the reorder point of {reorder_point} once {demand} units of open demand are fulfilled. "
            f"Recommend placing a reorder of {suggested} units this cycle to avoid a stockout before the next delivery window."
        )
    else:
        risk, explanation = "Low Risk", (
            f"{product.sku_code} is tracking within a safe range: {available} available against a reorder point "
            f"of {reorder_point}. Projected stock after fulfilling {demand} units of open demand is {projected}, "
            f"still above threshold. Suggested reorder of {suggested} units can be deferred to the next standard cycle."
        )
    return ReorderAssessment(product.id, product.sku_code, product.name, on_hand, allocated, damaged, available,
                             reorder_point, demand, projected, target, suggested, risk,
                             explanation + " Assumes no inbound stock is currently on order.")


def _attach_reorder_decisions(session: Session, assessments: list[ReorderAssessment], actor: str) -> None:
    """Create at most one unresolved reorder decision per SKU."""
    pending = list(session.scalars(select(Decision).where(
        Decision.decision_type == DecisionType.REORDER,
        Decision.status == DecisionStatus.PENDING,
    )))
    existing_by_sku = {decision.sku_id: decision for decision in pending}
    for assessment in assessments:
        if assessment.suggested_reorder is None or assessment.suggested_reorder <= 0:
            continue
        existing = existing_by_sku.get(assessment.sku_id)
        if existing:
            assessment.decision_id = existing.id
            continue
        decision = Decision(
            sku_id=assessment.sku_id, decision_type=DecisionType.REORDER,
            decision_mode=DecisionMode.APPROVAL_REQUIRED, status=DecisionStatus.PENDING,
            explanation=assessment.explanation,
            before_state=json.dumps({"available_stock": assessment.available_stock, "projected_stock": assessment.projected_stock}),
            after_state=json.dumps({"target_stock": assessment.target_stock, "suggested_reorder": assessment.suggested_reorder}),
            actor=actor,
        )
        session.add(decision)
        session.flush()
        assessment.decision_id = decision.id
