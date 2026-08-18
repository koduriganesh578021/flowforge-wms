from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, desc
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
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


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    reorder_point: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    target_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_of_measure: Mapped[str] = mapped_column(String, nullable=False, default="unit")

    inventory_records: Mapped[list["Inventory"]] = relationship(back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")
    events: Mapped[list["Event"]] = relationship(back_populates="product")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="product")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse: Mapped[str] = mapped_column(String, nullable=False)
    zone: Mapped[str] = mapped_column(String, nullable=False)
    aisle: Mapped[str] = mapped_column(String, nullable=False)
    rack: Mapped[str] = mapped_column(String, nullable=False)
    bin: Mapped[str] = mapped_column(String, nullable=False)
    location_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    inventory_records: Mapped[list["Inventory"]] = relationship(back_populates="location")
    pick_tasks: Mapped[list["PickTask"]] = relationship(back_populates="source_location")
    events: Mapped[list["Event"]] = relationship(back_populates="location")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("sku_id", "location_id", name="uq_inventory_sku_location"),
        Index("idx_inventory_sku", "sku_id"),
        Index("idx_inventory_location", "location_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sku_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    on_hand: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    allocated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    picked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    damaged: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    verification_status: Mapped[InventoryVerificationStatus] = mapped_column(
        Enum(InventoryVerificationStatus),
        nullable=False,
        default=InventoryVerificationStatus.VERIFIED,
    )
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped["Product"] = relationship(back_populates="inventory_records")
    location: Mapped["Location"] = relationship(back_populates="inventory_records")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_status", "status"),
        Index("idx_orders_priority", desc("priority_score")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    order_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String, nullable=False)
    customer_tier: Mapped[CustomerTier] = mapped_column(
        Enum(CustomerTier),
        nullable=False,
        default=CustomerTier.STANDARD,
    )
    shipping_type: Mapped[ShippingType] = mapped_column(
        Enum(ShippingType),
        nullable=False,
        default=ShippingType.STANDARD,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    order_value: Mapped[float] = mapped_column(nullable=False, default=0)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus),
        nullable=False,
        default=OrderStatus.CREATED,
    )
    priority_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority_label: Mapped[str | None] = mapped_column(String, nullable=True)
    risk_status: Mapped[str | None] = mapped_column(String, nullable=True)
    stage_entered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="order")
    events: Mapped[list["Event"]] = relationship(back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    sku_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_allocated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quantity_picked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quantity_dispatched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fulfillment_status: Mapped[str | None] = mapped_column(String, nullable=True)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")
    pick_tasks: Mapped[list["PickTask"]] = relationship(back_populates="order_item")


class PickTask(Base):
    __tablename__ = "pick_tasks"
    __table_args__ = (Index("idx_pick_tasks_status", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id"), nullable=False)
    source_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    quantity_required: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_confirmed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sequence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[PickTaskStatus] = mapped_column(
        Enum(PickTaskStatus),
        nullable=False,
        default=PickTaskStatus.PENDING,
    )
    assigned_worker: Mapped[str | None] = mapped_column(String, nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order_item: Mapped["OrderItem"] = relationship(back_populates="pick_tasks")
    source_location: Mapped["Location"] = relationship(back_populates="pick_tasks")


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (Index("idx_events_type_entity", "event_type", "sku_id", "location_id", "order_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[EventType] = mapped_column(Enum(EventType), nullable=False)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    sku_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    order: Mapped["Order | None"] = relationship(back_populates="events")
    product: Mapped["Product | None"] = relationship(back_populates="events")
    location: Mapped["Location | None"] = relationship(back_populates="events")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="event")


class Decision(Base):
    __tablename__ = "decisions"
    __table_args__ = (Index("idx_decisions_mode_status", "decision_mode", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), nullable=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    sku_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    decision_type: Mapped[DecisionType] = mapped_column(Enum(DecisionType), nullable=False)
    decision_mode: Mapped[DecisionMode] = mapped_column(Enum(DecisionMode), nullable=False)
    status: Mapped[DecisionStatus] = mapped_column(
        Enum(DecisionStatus),
        nullable=False,
        default=DecisionStatus.APPLIED,
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    before_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str] = mapped_column(String, nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    event: Mapped["Event | None"] = relationship(back_populates="decisions")
    order: Mapped["Order | None"] = relationship(back_populates="decisions")
    product: Mapped["Product | None"] = relationship(back_populates="decisions")

