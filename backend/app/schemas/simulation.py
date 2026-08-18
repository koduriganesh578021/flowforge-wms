from typing import Literal

from pydantic import BaseModel, Field


class SimulateEventRequest(BaseModel):
    event_type: Literal["NEW_URGENT_ORDER", "ITEM_DAMAGED", "ITEM_MISSING", "QC_FAILURE"]
    sku_id: int | None = None
    quantity: int | None = Field(default=None, gt=0)
    bin_id: int | None = None
    order_id: int | None = None
    customer_name: str | None = None
    due_at: str | None = None
    note: str | None = None
