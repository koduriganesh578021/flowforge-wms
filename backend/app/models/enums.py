from enum import Enum


class CustomerTier(str, Enum):
    VIP = "VIP"
    PREMIUM = "Premium"
    BUSINESS = "Business"
    STANDARD = "Standard"


class ShippingType(str, Enum):
    SAME_DAY = "Same-Day"
    EXPRESS = "Express"
    STANDARD = "Standard"


class OrderStatus(str, Enum):
    CREATED = "Created"
    PRIORITIZED = "Prioritized"
    AWAITING_ALLOCATION = "Awaiting Allocation"
    PARTIALLY_ALLOCATED = "Partially Allocated"
    ALLOCATED = "Allocated"
    READY_TO_PICK = "Ready to Pick"
    PICKING = "Picking"
    PICKED = "Picked"
    PACKING = "Packing"
    QC = "QC"
    QUALITY_CHECK = "Quality Check"
    READY_TO_DISPATCH = "Ready to Dispatch"
    DISPATCHED = "Dispatched"
    AWAITING_STOCK = "Awaiting Stock"
    BACKORDERED = "Backordered"
    EXCEPTION_REVIEW = "Exception Review"
    REWORK_REQUIRED = "Rework Required"
    CANCELLED = "Cancelled"


class PickTaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    PICKED = "Picked"
    EXCEPTION = "Exception"


class EventType(str, Enum):
    ORDER_CREATED = "ORDER_CREATED"
    ITEM_DAMAGED = "ITEM_DAMAGED"
    ITEM_MISSING = "ITEM_MISSING"
    QC_FAILED = "QC_FAILED"
    ORDER_DISPATCHED = "ORDER_DISPATCHED"


class DecisionType(str, Enum):
    ALLOCATION = "allocation"
    REORDER = "reorder"
    EXCEPTION = "exception"
    BOTTLENECK = "bottleneck"
    STATUS_TRANSITION = "status_transition"


class DecisionMode(str, Enum):
    AUTO_EXECUTED = "auto_executed"
    APPROVAL_REQUIRED = "approval_required"
    MANUAL_REVIEW = "manual_review"


class DecisionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    APPLIED = "applied"


class InventoryVerificationStatus(str, Enum):
    VERIFIED = "verified"
    NEEDS_COUNT = "needs_count"
    QUARANTINED = "quarantined"

