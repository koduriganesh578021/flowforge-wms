from datetime import datetime, timedelta, timezone

import pytest

from app.services.priority_engine import evaluate_priority, priority_label


NOW = datetime(2026, 8, 16, 15, 0, tzinfo=timezone.utc)


def test_vip_express_order_due_within_two_hours_is_critical():
    result = evaluate_priority(
        shipping_type="Express", customer_tier="VIP", due_at=NOW + timedelta(hours=2),
        order_value=25_000, now=NOW,
    )

    assert (result.score, result.label, result.risk_flag) == (90, "Critical", "Safe")
    assert result.reasons == [
        "Due within 2 hours (+30)",
        "Express shipping (+25)",
        "VIP customer (+25)",
        "High-value order above ₹20,000 (+10)",
    ]


def test_standard_order_has_normal_priority():
    result = evaluate_priority(
        shipping_type="Standard", customer_tier="Standard", due_at=NOW + timedelta(days=2),
        order_value=999, now=NOW,
    )

    assert (result.score, result.label, result.risk_flag) == (0, "Normal", "Safe")
    assert result.reasons == []


def test_business_order_and_dispatch_risk_are_scored_independently_of_deadline():
    result = evaluate_priority(
        shipping_type="Standard", customer_tier="Business", due_at=NOW + timedelta(days=1),
        order_value=2_000, predicted_dispatch_risk=True, now=NOW,
    )

    assert (result.score, result.label, result.risk_flag) == (30, "Medium", "At Risk")
    assert result.reasons == ["Business customer (+10)", "Predicted dispatch risk (+20)"]


@pytest.mark.parametrize(
    ("score", "expected"),
    [(29, "Normal"), (30, "Medium"), (54, "Medium"), (55, "High"), (79, "High"), (80, "Critical")],
)
def test_priority_label_threshold_boundaries(score, expected):
    assert priority_label(score) == expected


def test_same_day_and_two_hour_deadline_use_only_the_larger_urgency_signal():
    result = evaluate_priority(
        shipping_type="Same-Day", customer_tier="VIP", due_at=NOW + timedelta(minutes=90),
        order_value=25_000, now=NOW,
    )

    assert result.score == 75
    assert result.reasons[0] == "Same-Day urgency (+40)"
