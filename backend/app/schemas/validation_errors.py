from typing import Any

from pydantic import BaseModel, Field


class AllocationBlockReason(BaseModel):
    reason_code: str
    message: str
    details: dict[str, Any]


class AllocationBlockResponse(BaseModel):
    blocked: bool = True
    order_id: int
    reasons: list[AllocationBlockReason] = Field(min_length=1)
