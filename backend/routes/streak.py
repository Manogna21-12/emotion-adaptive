"""
Streak & Daily Time Tracking System
====================================
- Strict 24-hour UTC-based streak logic
- Daily time tracking with midnight reset
- DailyLog SQLite table (user_id, date, time_spent_minutes, activity_completed)
- Polling endpoint for real-time UI updates
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Date, Float, Integer, String, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from pg_db import async_session_factory, engine, init_pg
from pg_models import Base, StudentStats

log = logging.getLogger("streak")

router = APIRouter(prefix="/streak", tags=["Streak & Daily Tracking"])


# ─────────────────────────────────────────────────────────────────────────────
# SQLAlchemy model: DailyLog
# ─────────────────────────────────────────────────────────────────────────────

class DailyLog(Base):
    __tablename__ = "daily_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    time_spent_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    activity_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quiz_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    lessons_watched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class HeartbeatRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    minutes: float = Field(default=1.0, ge=0)          # time to accumulate
    activity_type: str = Field(default="heartbeat")    # heartbeat | video | quiz | lesson


class ActivityRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    activity_type: str = Field(default="lesson")       # lesson | quiz | video
    minutes_watched: float = Field(default=0.0, ge=0)


class StreakResponse(BaseModel):
    user_id: str
    current_streak: int
    today_minutes: float
    last_active: Optional[str]          # ISO string or None
    last_active_friendly: str           # "Just now", "2h ago", etc.
    today_activity_done: bool
    streak_frozen: bool
    weekly_history: list[dict]          # last 7 days: {date, minutes, active}
    monthly_history: list[dict]         # last 30 days heatmap
    total_sessions: int
    total_time_all_time: float


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _today_utc() -> date:
    return _utcnow().date()


def _friendly_time(ts: Optional[datetime]) -> str:
    if ts is None:
        return "Never"
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    diff = _utcnow() - ts
    secs = int(diff.total_seconds())
    if secs < 60:
        return "Just now"
    if secs < 3600:
        return f"{secs // 60}m ago"
    if secs < 86400:
        return f"{secs // 3600}h ago"
    return f"{secs // 86400}d ago"


async def _ensure_tables(session: AsyncSession) -> None:
    """Lazy-create tables if they don't exist yet."""
    init_pg()
    assert engine is not None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _get_session() -> AsyncSession:
    init_pg()
    assert async_session_factory is not None
    async with async_session_factory() as session:  # type: ignore[misc]
        yield session


# ─────────────────────────────────────────────────────────────────────────────
# Core streak update logic (used by multiple endpoints)
# ─────────────────────────────────────────────────────────────────────────────

async def _update_streak(session: AsyncSession, user_id: str) -> StudentStats:
    """
    Apply 24-hour streak logic and return updated StudentStats row.
    Rules:
      - First ever activity  → streak = 1
      - Activity on the same calendar day (UTC) → no change
      - Activity after exactly 1 day gap → streak + 1
      - Gap > 1 day → reset to 1
    """
    stmt = select(StudentStats).where(StudentStats.user_id == user_id)
    stats: Optional[StudentStats] = await session.scalar(stmt)

    now = _utcnow()
    today = now.date()

    if stats is None:
        stats = StudentStats(
            user_id=user_id,
            current_streak=1,
            last_active_date=now,
            total_time=0.0,
            sessions=0,
        )
        session.add(stats)
        log.info("[streak] New user %s – streak initialised to 1", user_id)
        return stats

    last_active = stats.last_active_date
    if last_active and last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)

    last_date: Optional[date] = last_active.date() if last_active else None

    if last_date == today:
        # Already active today – no streak change
        log.debug("[streak] User %s already active today, streak=%d", user_id, stats.current_streak)
    elif last_date == today - timedelta(days=1):
        # Consecutive day
        stats.current_streak = (stats.current_streak or 0) + 1
        log.info("[streak] User %s consecutive day – streak=%d", user_id, stats.current_streak)
    else:
        # Gap > 1 day → reset
        old = stats.current_streak
        stats.current_streak = 1
        log.info("[streak] User %s gap detected (last=%s) – reset from %d to 1", user_id, last_date, old)

    stats.last_active_date = now
    return stats


async def _get_or_create_daily_log(session: AsyncSession, user_id: str, today: date) -> DailyLog:
    stmt = select(DailyLog).where(
        DailyLog.user_id == user_id,
        DailyLog.date == today,
    )
    row: Optional[DailyLog] = await session.scalar(stmt)
    if row is None:
        row = DailyLog(user_id=user_id, date=today, time_spent_minutes=0.0)
        session.add(row)
    return row


def _is_valid_activity(activity_type: str, minutes: float) -> bool:
    """
    Valid activity = quiz OR (video/lesson watched >= 5 minutes).
    """
    if activity_type in ("quiz",):
        return True
    return minutes >= 5.0


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint: GET /streak/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=StreakResponse)
async def get_streak(user_id: str):
    """Return current streak + today's time + last 30 days history."""
    init_pg()
    assert async_session_factory is not None
    async with async_session_factory() as session:   # type: ignore[misc]
        await _ensure_tables(session)
        today = _today_utc()

        # Stats row
        stats: Optional[StudentStats] = await session.scalar(
            select(StudentStats).where(StudentStats.user_id == user_id)
        )

        # Daily log for today
        daily: Optional[DailyLog] = await session.scalar(
            select(DailyLog).where(
                DailyLog.user_id == user_id,
                DailyLog.date == today,
            )
        )

        # History: last 30 days
        thirty_ago = today - timedelta(days=29)
        logs_stmt = select(DailyLog).where(
            DailyLog.user_id == user_id,
            DailyLog.date >= thirty_ago,
        ).order_by(DailyLog.date)
        result = await session.execute(logs_stmt)
        history_rows: list[DailyLog] = list(result.scalars().all())

        # Build history maps
        history_map = {row.date: row for row in history_rows}
        monthly_history = []
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            row = history_map.get(d)
            monthly_history.append({
                "date": d.isoformat(),
                "minutes": round(row.time_spent_minutes, 1) if row else 0.0,
                "active": bool(row and row.activity_completed),
            })

        weekly_history = monthly_history[-7:]

        last_active = stats.last_active_date if stats else None
        if last_active and last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)

        return StreakResponse(
            user_id=user_id,
            current_streak=stats.current_streak if stats else 0,
            today_minutes=round(daily.time_spent_minutes, 1) if daily else 0.0,
            last_active=last_active.isoformat() if last_active else None,
            last_active_friendly=_friendly_time(last_active),
            today_activity_done=bool(daily and daily.activity_completed),
            streak_frozen=False,
            weekly_history=weekly_history,
            monthly_history=monthly_history,
            total_sessions=stats.sessions if stats else 0,
            total_time_all_time=round(stats.total_time, 1) if stats else 0.0,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint: POST /streak/heartbeat  (called every 60 s from frontend)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/heartbeat")
async def heartbeat(req: HeartbeatRequest):
    """
    Accumulate time spent. Called every minute from the frontend.
    Does NOT count as a valid activity by itself (heartbeat only adds minutes).
    """
    init_pg()
    assert async_session_factory is not None
    async with async_session_factory() as session:   # type: ignore[misc]
        await _ensure_tables(session)
        today = _today_utc()

        stats = await _update_streak(session, req.user_id)
        daily = await _get_or_create_daily_log(session, req.user_id, today)

        # Accumulate time
        daily.time_spent_minutes = (daily.time_spent_minutes or 0.0) + req.minutes
        stats.total_time = (stats.total_time or 0.0) + req.minutes
        stats.last_active_date = _utcnow()

        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        return {
            "status": "ok",
            "today_minutes": round(daily.time_spent_minutes, 1),
            "current_streak": stats.current_streak,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint: POST /streak/activity  (called when valid learning activity done)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/activity")
async def log_activity(req: ActivityRequest):
    """
    Log a valid learning activity (quiz, 5+ min video, lesson completion).
    This is what drives the streak counter.
    """
    init_pg()
    assert async_session_factory is not None
    async with async_session_factory() as session:   # type: ignore[misc]
        await _ensure_tables(session)
        today = _today_utc()

        is_valid = _is_valid_activity(req.activity_type, req.minutes_watched)
        stats = await _update_streak(session, req.user_id)
        daily = await _get_or_create_daily_log(session, req.user_id, today)

        # Accumulate today's time
        if req.minutes_watched > 0:
            daily.time_spent_minutes = (daily.time_spent_minutes or 0.0) + req.minutes_watched
            stats.total_time = (stats.total_time or 0.0) + req.minutes_watched

        # Mark day as completed only if this is a valid activity and not already done
        if is_valid and not daily.activity_completed:
            daily.activity_completed = True
            log.info("[streak] User %s completed valid activity – day marked done", req.user_id)

        if req.activity_type == "quiz":
            daily.quiz_completed = True
        if req.activity_type in ("video", "lesson"):
            daily.lessons_watched = (daily.lessons_watched or 0) + 1

        # Increment session count once per day
        if not daily.activity_completed:
            stats.sessions = (stats.sessions or 0) + 1

        stats.last_active_date = _utcnow()

        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        return {
            "status": "ok",
            "current_streak": stats.current_streak,
            "today_minutes": round(daily.time_spent_minutes, 1),
            "activity_valid": is_valid,
            "activity_completed_today": daily.activity_completed,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint: GET /streak/history/{user_id}?period=weekly|monthly
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/history/{user_id}")
async def get_history(user_id: str, period: str = "weekly"):
    """Return weekly or monthly activity history for graphs."""
    init_pg()
    assert async_session_factory is not None
    async with async_session_factory() as session:   # type: ignore[misc]
        await _ensure_tables(session)
        today = _today_utc()
        days = 7 if period == "weekly" else 30
        start = today - timedelta(days=days - 1)

        result = await session.execute(
            select(DailyLog).where(
                DailyLog.user_id == user_id,
                DailyLog.date >= start,
            ).order_by(DailyLog.date)
        )
        rows = result.scalars().all()
        row_map = {r.date: r for r in rows}

        history = []
        for i in range(days - 1, -1, -1):
            d = today - timedelta(days=i)
            row = row_map.get(d)
            history.append({
                "date": d.isoformat(),
                "day": d.strftime("%a"),
                "minutes": round(row.time_spent_minutes, 1) if row else 0.0,
                "active": bool(row and row.activity_completed),
                "quiz": bool(row and row.quiz_completed),
                "lessons": row.lessons_watched if row else 0,
            })

        return {"period": period, "history": history}
