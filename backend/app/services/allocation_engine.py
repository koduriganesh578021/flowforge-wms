"""Transaction-safe, explainable inventory allocation."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Decision, Inventory, Order, OrderItem
from app.models.enums import (
    DecisionMode,
    DecisionStatus,
    DecisionType,
    InventoryVerificationStatus,
    OrderStatus,
)


ELIGIBLE_STATUSES = {
    OrderStatus.CREATED,
    OrderStatus.PRIORITIZED,
    OrderStatus.AWAITING_ALLOCATION,
    OrderStatus.PARTIALLY_ALLOCATED,
    OrderStatus.ALLOCATED,
}


@dataclass(frozen=True)
class BinAllocation:
    location_id: int
    location_code: str
    quantity_taken: int
    verification_status: str
    confidence_score: int


@dataclass(frozen=True)
class LineAllocationResult:
    order_item_id: int
    sku_id: int
    quantity_requested: int
    quantity_allocated_before: int
    quantity_allocated_after: int
    quantity_newly_allocated: int
    quantity_unfulfilled: int
    line_status: str
    source_bins: list[BinAllocation]
    explanation: str


@dataclass(frozen=True)
class OrderAllocationResult:
    order_id: int
    previous_status: str
    new_status: str
    explanation: str
    lines: list[LineAllocationResult]


@dataclass(frozen=True)
class ShortageRecommendation:
    sku_id: int
    total_unfulfilled_across_orders: int
    affected_order_ids: list[int]
    suggested_reorder_quantity: int | None
    explanation: str


@dataclass(frozen=True)
class DecisionRef:
    decision_id: int
    type: str
    sku_id: int
    from_order_id: int
    to_order_id: int
    quantity_candidate: int
    status: str
    explanation: str


@dataclass(frozen=True)
class AllocationRunResult:
    timestamp: datetime
    orders: list[OrderAllocationResult]
    unresolved_shortages: list[ShortageRecommendation]
    decisions_created: list[DecisionRef]
    confidence_recommendations: list[str] = field(default_factory=list)


def allocate_eligible_orders(session: Session, *, actor: str = "system") -> AllocationRunResult:
    """Allocate all eligible orders atomically according to the allocation contract.

    The supplied session must not already own an active transaction.  All reads,
    decisions, and writes are committed together, or rolled back together.
    """
    with session.begin():
        orders = list(session.scalars(
            select(Order).where(Order.status.in_(ELIGIBLE_STATUSES)).options(selectinload(Order.items))
        ))
        inventories = list(session.scalars(
            select(Inventory).options(selectinload(Inventory.location)).with_for_update()
        ))
        _validate_invariants(inventories, orders)

        orders.sort(key=_order_sort_key)
        inventory_by_sku: dict[int, list[Inventory]] = {}
        for inventory in inventories:
            inventory_by_sku.setdefault(inventory.sku_id, []).append(inventory)
        for sku_inventories in inventory_by_sku.values():
            sku_inventories.sort(key=_bin_sort_key)

        results: list[OrderAllocationResult] = []
        shortages: dict[int, list[tuple[int, int]]] = {}
        confidence_recommendations: list[str] = []
        ordinary_decisions: list[Decision] = []

        for order in orders:
            previous_status = order.status
            line_results: list[LineAllocationResult] = []
            newly_allocated_for_order = 0
            for item in order.items:
                line_result, used_low_confidence = _allocate_line(item, inventory_by_sku.get(item.sku_id, []))
                line_results.append(line_result)
                newly_allocated_for_order += line_result.quantity_newly_allocated
                if line_result.quantity_unfulfilled:
                    shortages.setdefault(item.sku_id, []).append((order.id, line_result.quantity_unfulfilled))
                if used_low_confidence:
                    confidence_recommendations.append(
                        f"Cycle count recommended for SKU {item.sku_id}: allocation used Needs Count inventory."
                    )
                if line_result.quantity_newly_allocated:
                    ordinary_decisions.append(Decision(
                        order_id=order.id,
                        sku_id=item.sku_id,
                        decision_type=DecisionType.ALLOCATION,
                        decision_mode=DecisionMode.AUTO_EXECUTED,
                        status=DecisionStatus.APPLIED,
                        explanation=line_result.explanation,
                        before_state=json.dumps({"quantity_allocated": line_result.quantity_allocated_before}),
                        after_state=json.dumps({"quantity_allocated": line_result.quantity_allocated_after}),
                        actor=actor,
                    ))

            if newly_allocated_for_order:
                order.status = _next_status(order, line_results)
            results.append(OrderAllocationResult(
                order_id=order.id,
                previous_status=previous_status.value,
                new_status=order.status.value,
                explanation=_order_explanation(previous_status, order.status, line_results),
                lines=line_results,
            ))

        session.add_all(ordinary_decisions)
        reallocation_decisions = _create_reallocation_decisions(session, orders, shortages, actor)
        session.flush()

        shortage_results = [_shortage_result(sku_id, demands) for sku_id, demands in shortages.items()]
        decision_refs = [
            DecisionRef(
                decision_id=decision.id,
                type="REALLOCATION_APPROVAL_REQUIRED",
                sku_id=decision.sku_id,
                from_order_id=json.loads(decision.before_state)["from_order_id"],
                to_order_id=decision.order_id,
                quantity_candidate=json.loads(decision.before_state)["quantity_candidate"],
                status="Pending Approval",
                explanation=decision.explanation,
            )
            for decision in reallocation_decisions
        ]
        return AllocationRunResult(
            timestamp=datetime.now(timezone.utc), orders=results,
            unresolved_shortages=shortage_results, decisions_created=decision_refs,
            confidence_recommendations=confidence_recommendations,
        )


def _allocate_line(item: OrderItem, inventories: list[Inventory]) -> tuple[LineAllocationResult, bool]:
    before = item.quantity_allocated
    remaining = item.quantity_requested - before
    if remaining == 0:
        return _line_result(item, before, [], "Already fully allocated."), False

    source_bins: list[BinAllocation] = []
    used_low_confidence = False
    for inventory in inventories:
        if inventory.verification_status == InventoryVerificationStatus.QUARANTINED:
            continue
        available = inventory.on_hand - inventory.allocated - inventory.damaged
        if available <= 0 or remaining <= 0:
            continue
        taken = min(remaining, available)
        inventory.allocated += taken
        item.quantity_allocated += taken
        remaining -= taken
        source_bins.append(BinAllocation(
            location_id=inventory.location_id,
            location_code=inventory.location.location_code,
            quantity_taken=taken,
            verification_status=inventory.verification_status.value,
            confidence_score=inventory.confidence_score,
        ))
        used_low_confidence |= inventory.verification_status == InventoryVerificationStatus.NEEDS_COUNT

    suffix = " Confidence warning: Needs Count inventory was used; cycle count recommended." if used_low_confidence else ""
    if not source_bins and any(i.verification_status == InventoryVerificationStatus.QUARANTINED for i in inventories):
        suffix = " Quarantined inventory was excluded."
    return _line_result(item, before, source_bins, suffix), used_low_confidence


def _line_result(item: OrderItem, before: int, source_bins: list[BinAllocation], suffix: str) -> LineAllocationResult:
    newly_allocated = item.quantity_allocated - before
    unfulfilled = item.quantity_requested - item.quantity_allocated
    if item.quantity_requested <= 0:
        status = "Not Required"
    elif item.quantity_allocated <= 0:
        status = "Backordered"
    elif item.quantity_allocated < item.quantity_requested:
        status = "Partially Allocated"
    else:
        status = "Allocated"
    if newly_allocated:
        bins = ", ".join(f"{bin.location_code} ({bin.quantity_taken})" for bin in source_bins)
        explanation = f"Allocated {newly_allocated} unit(s) from {bins}.{suffix}"
    elif before == item.quantity_requested:
        explanation = "Already fully allocated."
    else:
        explanation = f"No allocatable inventory available.{suffix}"
    return LineAllocationResult(item.id, item.sku_id, item.quantity_requested, before, item.quantity_allocated,
                                newly_allocated, unfulfilled, status, source_bins, explanation)


def _create_reallocation_decisions(session: Session, orders: list[Order], shortages: dict[int, list[tuple[int, int]]], actor: str) -> list[Decision]:
    created: list[Decision] = []
    lines_by_sku: dict[int, list[tuple[Order, OrderItem]]] = {}
    for order in orders:
        for item in order.items:
            lines_by_sku.setdefault(item.sku_id, []).append((order, item))
    pending = list(session.scalars(select(Decision).where(
        Decision.decision_type == DecisionType.REALLOCATION_APPROVAL_REQUIRED,
        Decision.status == DecisionStatus.PENDING,
    )))
    existing = {
        (decision.sku_id, json.loads(decision.before_state)["from_order_id"], decision.order_id)
        for decision in pending if decision.before_state
    }
    for sku_id, demands in shortages.items():
        for to_order_id, shortage in demands:
            to_order = next(order for order in orders if order.id == to_order_id)
            lower_holders = [
                (order, item) for order, item in lines_by_sku.get(sku_id, [])
                if order.priority_score is not None and (to_order.priority_score or 0) > order.priority_score
                and item.quantity_allocated > item.quantity_picked
            ]
            for from_order, item in lower_holders:
                key = (sku_id, from_order.id, to_order_id)
                if key in existing or shortage <= 0:
                    continue
                candidate = min(shortage, item.quantity_allocated - item.quantity_picked)
                explanation = (
                    f"Approval required to reallocate {candidate} unit(s) of SKU {sku_id} "
                    f"from lower-priority order {from_order.id} to order {to_order_id}."
                )
                decision = Decision(
                    order_id=to_order_id, sku_id=sku_id,
                    decision_type=DecisionType.REALLOCATION_APPROVAL_REQUIRED,
                    decision_mode=DecisionMode.APPROVAL_REQUIRED, status=DecisionStatus.PENDING,
                    explanation=explanation,
                    before_state=json.dumps({"from_order_id": from_order.id, "quantity_candidate": candidate}),
                    actor=actor,
                )
                session.add(decision)
                created.append(decision)
                existing.add(key)
                shortage -= candidate
    return created


def _validate_invariants(inventories: list[Inventory], orders: list[Order]) -> None:
    for inventory in inventories:
        if inventory.on_hand - inventory.allocated - inventory.damaged < 0:
            raise ValueError(f"Inventory {inventory.id} has negative availability")
    for order in orders:
        for item in order.items:
            if not item.quantity_requested >= item.quantity_allocated >= item.quantity_picked >= item.quantity_dispatched >= 0:
                raise ValueError(f"Order item {item.id} violates allocation quantity invariants")


def _order_sort_key(order: Order) -> tuple[int, int, datetime, int]:
    due_at = order.due_at or datetime.max.replace(tzinfo=timezone.utc)
    return (-(order.priority_score or 0), order.due_at is None, due_at, order.created_at, order.id)


def _bin_sort_key(inventory: Inventory) -> tuple[int, int, str]:
    verified_rank = 0 if inventory.verification_status == InventoryVerificationStatus.VERIFIED else 1
    return (verified_rank, -inventory.confidence_score, inventory.location.location_code)


def _next_status(order: Order, lines: list[LineAllocationResult]) -> OrderStatus:
    if all(line.quantity_unfulfilled == 0 for line in lines):
        return OrderStatus.ALLOCATED
    return OrderStatus.PARTIALLY_ALLOCATED


def _order_explanation(previous: OrderStatus, current: OrderStatus, lines: list[LineAllocationResult]) -> str:
    newly_allocated = sum(line.quantity_newly_allocated for line in lines)
    if not newly_allocated:
        return "No new allocation; existing order status was retained."
    return f"Allocated {newly_allocated} unit(s); status changed from {previous.value} to {current.value}."


def _shortage_result(sku_id: int, demands: list[tuple[int, int]]) -> ShortageRecommendation:
    unfulfilled = sum(quantity for _, quantity in demands)
    order_ids = [order_id for order_id, _ in demands]
    return ShortageRecommendation(
        sku_id=sku_id, total_unfulfilled_across_orders=unfulfilled, affected_order_ids=order_ids,
        suggested_reorder_quantity=None,
        explanation=f"SKU {sku_id} has {unfulfilled} unit(s) of immediate unmet demand across orders {order_ids}.",
    )
