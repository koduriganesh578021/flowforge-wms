from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import OrderStatus, PickTaskStatus


class ORMResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class OrderListItem(ORMResponse):
    id: int
    order_code: str
    customer_name: str
    status: OrderStatus
    priority_score: int | None
    priority_label: str | None
    risk_status: str | None
    due_at: datetime | None


class OrderItemDetail(ORMResponse):
    id: int
    sku_id: int
    quantity_requested: int
    quantity_allocated: int
    quantity_picked: int
    quantity_dispatched: int
    unfulfilled_at_allocation: int
    remaining_to_ship: int


class PickTaskDetail(ORMResponse):
    id: int
    order_item_id: int
    source_location_id: int
    quantity_required: int
    quantity_confirmed: int
    sequence: int | None
    status: PickTaskStatus
    assigned_worker: str | None


class PriorityExplanation(BaseModel):
    score: int
    label: str
    risk_flag: str
    reasons: list[str]


class OrderDetail(ORMResponse):
    id: int
    order_code: str
    customer_name: str
    status: OrderStatus
    priority_score: int | None
    priority_label: str | None
    risk_status: str | None
    due_at: datetime | None
    items: list[OrderItemDetail]
    pick_tasks: list[PickTaskDetail]
    priority_explanation: PriorityExplanation | None


class PrioritizeResponse(BaseModel):
    order_id: int
    score: int
    label: str
    risk_flag: str
    reasons: list[str]
    decision_id: int


class BinAllocationResponse(ORMResponse):
    location_id: int
    location_code: str
    quantity_taken: int
    verification_status: str
    confidence_score: int


class AllocationLineResponse(ORMResponse):
    order_item_id: int
    sku_id: int
    quantity_requested: int
    quantity_allocated_before: int
    quantity_allocated_after: int
    quantity_newly_allocated: int
    quantity_unfulfilled: int
    line_status: str
    source_bins: list[BinAllocationResponse]
    explanation: str


class AllocationOrderResponse(ORMResponse):
    order_id: int
    previous_status: str
    new_status: str
    explanation: str
    lines: list[AllocationLineResponse]


class ShortageResponse(ORMResponse):
    sku_id: int
    total_unfulfilled_across_orders: int
    affected_order_ids: list[int]
    suggested_reorder_quantity: int | None
    explanation: str


class AllocationDecisionResponse(ORMResponse):
    decision_id: int
    type: str
    sku_id: int
    from_order_id: int
    to_order_id: int
    quantity_candidate: int
    status: str
    explanation: str


class AllocateResponse(BaseModel):
    order: AllocationOrderResponse
    unresolved_shortages: list[ShortageResponse]
    decisions_created: list[AllocationDecisionResponse]
    confidence_recommendations: list[str]
