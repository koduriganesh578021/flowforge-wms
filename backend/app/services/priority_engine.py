"""Deterministic, explainable priority scoring for warehouse orders."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping


HIGH_VALUE_THRESHOLD = 20_000


@dataclass(frozen=True)
class PriorityAssessment:
    score: int
    label: str
    reasons: list[str]
    risk_flag: str


def evaluate_priority(
    order: object | Mapping[str, Any] | None = None,
    *,
    shipping_type: str | None = None,
    customer_tier: str | None = None,
    due_at: datetime | None = None,
    order_value: float | None = None,
    predicted_dispatch_risk: bool = False,
    now: datetime | None = None,
) -> PriorityAssessment:
    """Score an order using the documented policy without database dependencies.

    ``order`` may be a mapping or an object with matching attributes. Explicit
    keyword values take precedence, which makes the function convenient for
    both application code and small unit tests.
    """
    shipping_type = shipping_type if shipping_type is not None else _field(order, "shipping_type")
    customer_tier = customer_tier if customer_tier is not None else _field(order, "customer_tier")
    due_at = due_at if due_at is not None else _field(order, "due_at")
    order_value = order_value if order_value is not None else _field(order, "order_value")
    now = now or datetime.now(timezone.utc)

    shipping_type = _enum_value(shipping_type)
    customer_tier = _enum_value(customer_tier)
    reasons: list[str] = []
    score = 0

    # Same-Day and deadline buckets describe one time-pressure signal.
    urgency_points, urgency_reason = _urgency(due_at, shipping_type, now)
    if urgency_points:
        score += urgency_points
        reasons.append(urgency_reason)

    if shipping_type == "Express":
        score += 25
        reasons.append("Express shipping (+25)")

    tier_points = {"VIP": 25, "Business": 10}.get(customer_tier, 0)
    if tier_points:
        score += tier_points
        reasons.append(f"{customer_tier} customer (+{tier_points})")

    if order_value is not None and order_value > HIGH_VALUE_THRESHOLD:
        score += 10
        reasons.append(f"High-value order above ₹{HIGH_VALUE_THRESHOLD:,} (+10)")

    if predicted_dispatch_risk:
        score += 20
        reasons.append("Predicted dispatch risk (+20)")

    missing = [
        name
        for name, value in (
            ("due_at", due_at),
            ("shipping_type", shipping_type),
            ("customer_tier", customer_tier),
            ("order_value", order_value),
        )
        if value is None
    ]
    if missing:
        reasons.append(f"Data incomplete: missing {', '.join(missing)}")

    score = min(score, 100)
    return PriorityAssessment(
        score=score,
        label=priority_label(score),
        reasons=reasons,
        risk_flag=_risk_flag(due_at, now, predicted_dispatch_risk, bool(missing)),
    )


def priority_label(score: int) -> str:
    """Return the documented priority band for a (possibly precomputed) score."""
    if score >= 80:
        return "Critical"
    if score >= 55:
        return "High"
    if score >= 30:
        return "Medium"
    return "Normal"


def _urgency(due_at: datetime | None, shipping_type: str | None, now: datetime) -> tuple[int, str]:
    candidates: list[tuple[int, str]] = []
    if shipping_type == "Same-Day":
        candidates.append((40, "Same-Day urgency (+40)"))
    if due_at is not None:
        hours_remaining = (_as_utc(due_at) - _as_utc(now)).total_seconds() / 3600
        if 0 <= hours_remaining <= 2:
            candidates.append((30, "Due within 2 hours (+30)"))
        elif 2 < hours_remaining <= 8:
            candidates.append((15, "Due within 8 hours (+15)"))
    return max(candidates, default=(0, ""), key=lambda candidate: candidate[0])


def _risk_flag(due_at: datetime | None, now: datetime, predicted_risk: bool, data_incomplete: bool) -> str:
    if due_at is not None and _as_utc(due_at) < _as_utc(now):
        return "Blocked"
    if data_incomplete:
        return "Unknown"
    return "At Risk" if predicted_risk else "Safe"


def _field(order: object | Mapping[str, Any] | None, name: str) -> Any:
    if isinstance(order, Mapping):
        return order.get(name)
    return getattr(order, name, None) if order is not None else None


def _enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
