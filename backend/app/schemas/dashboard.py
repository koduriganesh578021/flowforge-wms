from typing import Any

from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    pending_orders: int
    critical_orders: int
    low_stock_skus: int
    open_exceptions: int
    average_fulfillment_time: float | None = None


class BottleneckSummary(BaseModel):
    stage: str
    queue_size: int
    average_wait_minutes: float
    severity: str
    recommendation: str


class ExceptionAlert(BaseModel):
    id: int
    event_type: str
    severity: str
    summary: str
    context: dict[str, Any]


class TopAction(BaseModel):
    action_type: str
    title: str
    description: str
    context: dict[str, Any]


class CommandCenterResponse(BaseModel):
    kpis: DashboardKPIs
    top_bottlenecks: list[BottleneckSummary]
    top_exceptions: list[ExceptionAlert]
    top_actions: list[TopAction]
