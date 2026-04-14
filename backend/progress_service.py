from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import pytz

@dataclass(frozen=True)
class ProgressMetrics:
    learning_consistency: float
    peak_focus_time: str
    focus_score: float
    trend: str
    trend_detail: str | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_dt(ts) -> datetime | None:
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    return None


def compute_progress_from_emotion_logs(logs: list[dict]) -> ProgressMetrics:
    """
    Compute:
    - learning_consistency: active days in last 7 days / 7 * 100
    - peak_focus_time: most active hour in last 7 days (count of logs) -> "HH:00 - HH+1:00"
    - focus_score: average focus in last 7 days (0-100)
    - trend: Improving / Stable / Declining based on avg focus last 3 days vs previous 3 days
    """
    ist = pytz.timezone("Asia/Kolkata")
    now_utc = _utcnow()
    now_ist = now_utc.astimezone(ist)
    seven_days_ago_utc = now_utc - timedelta(days=7)

    # Normalize, filter, and sort
    normalized = []
    for l in logs:
        ts = _coerce_dt(l.get("timestamp"))
        if not ts:
            continue
        if ts < seven_days_ago_utc:
            continue
        focus_val = l.get("focus", l.get("focusLevel", 0))
        try:
            focus = float(focus_val)
        except Exception:
            focus = 0.0
        normalized.append({"timestamp": ts, "focus": max(0.0, min(100.0, focus))})

    if not normalized:
        return ProgressMetrics(
            learning_consistency=0.0,
            peak_focus_time="No data",
            focus_score=0.0,
            trend="Stable",
            trend_detail="No recent activity (last 7 days).",
        )

    # Consistency: last 7 days activity (IST days)
    active_days = {n["timestamp"].astimezone(ist).date() for n in normalized}
    learning_consistency = round((len(active_days) / 7) * 100, 1)

    # Peak hour by activity count (IST hour)
    hour_counts = Counter(n["timestamp"].astimezone(ist).hour for n in normalized)
    peak_hour = hour_counts.most_common(1)[0][0]
    start_dt = now_ist.replace(hour=peak_hour, minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(hours=1)
    peak_focus_time = f"{start_dt.strftime('%I:%M %p')} - {end_dt.strftime('%I:%M %p')}"

    # Focus score average
    focus_score = round(sum(n["focus"] for n in normalized) / len(normalized), 1)

    # Trend: compare recent 3 days avg vs previous 3 days avg (within the last 7 days)
    by_day: dict[datetime.date, list[float]] = defaultdict(list)
    for n in normalized:
        by_day[n["timestamp"].astimezone(ist).date()].append(n["focus"])

    # Build last 7 dates list (including days with no activity)
    days = [(now_ist - timedelta(days=i)).date() for i in range(0, 7)]
    recent_days = days[0:3]
    prev_days = days[3:6]

    def avg_for(day_list):
        vals = []
        for d in day_list:
            vals.extend(by_day.get(d, []))
        return (sum(vals) / len(vals)) if vals else None

    recent_avg = avg_for(recent_days)
    prev_avg = avg_for(prev_days)

    trend = "Stable"
    detail = None
    if recent_avg is None and prev_avg is None:
        trend = "Stable"
        detail = "Not enough activity to determine a trend."
    elif prev_avg is None:
        trend = "Improving"
        detail = "New activity detected; trend assumed improving."
    elif recent_avg is None:
        trend = "Declining"
        detail = "No recent activity; trend assumed declining."
    else:
        delta = recent_avg - prev_avg
        if delta > 5:
            trend = "Improving"
            detail = f"Avg focus up by {delta:.1f} points vs previous 3 days."
        elif delta < -5:
            trend = "Declining"
            detail = f"Avg focus down by {abs(delta):.1f} points vs previous 3 days."
        else:
            trend = "Stable"
            detail = f"Avg focus change {delta:.1f} points vs previous 3 days."

    return ProgressMetrics(
        learning_consistency=learning_consistency,
        peak_focus_time=peak_focus_time,
        focus_score=focus_score,
        trend=trend,
        trend_detail=detail,
    )

