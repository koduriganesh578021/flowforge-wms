from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import (
    CustomerTier,
    DecisionMode,
    DecisionStatus,
    DecisionType,
    EventType,
    InventoryVerificationStatus,
    OrderStatus,
    PickTaskStatus,
    ShippingType,
)


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProductRead(ORMBaseModel):
    id: int
    sku_code: str
    name: str
    category: str | None
    reorder_point: int
    target_stock: int
    unit_of_measure: str


class LocationRead(ORMBaseModel):
    id: int
    warehouse: str
    zone: str
    aisle: str
    rack: str
    bin: str
    location_code: str


class InventoryRead(ORMBaseModel):
    id: int
    sku_id: int
    location_id: int
    on_hand: int
    allocated: int
    picked: int
    damaged: int
    confidence_score: int
    verification_status: InventoryVerificationStatus
    last_verified_at: datetime | None


class OrderRead(ORMBaseModel):
    id: int
    order_code: str
    customer_name: str
    customer_tier: CustomerTier
    shipping_type: ShippingType
    created_at: datetime
    due_at: datetime | None
    order_value: float
    status: OrderStatus
    priority_score: int | None
    priority_label: str | None
    risk_status: str | None
    stage_entered_at: datetime | None


class OrderItemRead(ORMBaseModel):
    id: int
    order_id: int
    sku_id: int
    quantity_requested: int
    quantity_allocated: int
    quantity_picked: int
    quantity_dispatched: int


class PickTaskRead(ORMBaseModel):
    id: int
    order_item_id: int
    source_location_id: int
    quantity_required: int
    quantity_confirmed: int
    sequence: int | None
    status: PickTaskStatus
    assigned_worker: str | None


class EventRead(ORMBaseModel):
    id: int
    event_type: EventType
    order_id: int | None
    sku_id: int | None
    location_id: int | None
    quantity: int | None
    payload: str | None
    reported_by: str | None
    created_at: datetime


class DecisionRead(ORMBaseModel):
    id: int
    event_id: int | None
    order_id: int | None
    sku_id: int | None
    decision_type: DecisionType
    decision_mode: DecisionMode
    status: DecisionStatus
    explanation: str
    before_state: str | None
    after_state: str | None
    actor: str
    created_at: datetime

