from datetime import datetime, timezone

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import emotion_logs_collection
from pg_db import async_session_factory, init_pg, engine
from pg_models import Base, Progress
from progress_service import compute_progress_from_emotion_logs


router = APIRouter(tags=["progress"])


class ProgressUpsertRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    recompute: bool = True


class ProgressResponse(BaseModel):
    user_id: str
    learning_consistency: str
    peak_focus_time: str
    focus_score: str
    trend: str
    updated_at: str | None = None


async def _ensure_tables():
    init_pg()
    assert engine is not None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def _as_progress_response(user_id: str, *, learning_consistency, peak_focus_time, focus_score, trend, updated_at):
    return ProgressResponse(
        user_id=str(user_id),
        learning_consistency=str(learning_consistency),
        peak_focus_time=str(peak_focus_time),
        focus_score=str(focus_score),
        trend=str(trend),
        updated_at=(updated_at.isoformat() if isinstance(updated_at, datetime) else (str(updated_at) if updated_at else None)),
    )


# NOTE: We intentionally do not auto-create the table on app startup here,
# because this router startup hook won't reliably run unless the router is
# mounted as a sub-app. We call _ensure_tables() inside the endpoints instead.


async def _compute_for_user(user_id: str):
    # Pull last 7 days logs only; compute in python.
    cursor = emotion_logs_collection.find(
        {"$or": [{"user_id": user_id}, {"userId": user_id}]}
    ).sort("timestamp", -1).limit(2000)
    logs = await cursor.to_list(length=2000)
    return compute_progress_from_emotion_logs(logs)


@router.get("/progress/{user_id}", response_model=ProgressResponse)
async def get_progress(user_id: str):
    print(f"[progress] GET /progress/{user_id}")

    # If Postgres isn't configured, fall back to computing from MongoDB so the UI stays dynamic.
    if not (os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL") or os.getenv("POSTGRES_DSN")):
        metrics = await _compute_for_user(user_id)
        # Not an error condition for users; return "no data" values if nothing exists.
        return _as_progress_response(
            user_id,
            learning_consistency=f"{metrics.learning_consistency:.1f}",
            peak_focus_time=metrics.peak_focus_time,
            focus_score=f"{metrics.focus_score:.1f}",
            trend=metrics.trend,
            updated_at=datetime.now(timezone.utc),
        )

    await _ensure_tables()
    init_pg()
    if async_session_factory is None:
        raise HTTPException(status_code=500, detail="Progress DB session factory not initialized.")

    async with async_session_factory() as session:  # type: ignore[misc]
        row = await session.scalar(select(Progress).where(Progress.user_id == user_id))
        if not row:
            # No row yet: compute & create
            metrics = await _compute_for_user(user_id)
            row = Progress(
                user_id=user_id,
                learning_consistency=metrics.learning_consistency,
                peak_focus_time=metrics.peak_focus_time,
                focus_score=metrics.focus_score,
                trend=metrics.trend,
                trend_detail=metrics.trend_detail,
                updated_at=datetime.now(timezone.utc),
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)

        return _as_progress_response(
            row.user_id,
            learning_consistency=f"{float(row.learning_consistency):.1f}",
            peak_focus_time=row.peak_focus_time,
            focus_score=f"{float(row.focus_score):.1f}",
            trend=row.trend,
            updated_at=row.updated_at,
        )

@router.post("/progress", response_model=ProgressResponse)
async def upsert_progress(req: ProgressUpsertRequest):
    print(f"[progress] POST /progress user_id={req.user_id} recompute={req.recompute}")

    if not (os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL") or os.getenv("POSTGRES_DSN")):
        # Fallback: compute-only mode.
        metrics = await _compute_for_user(req.user_id)
        return _as_progress_response(
            req.user_id,
            learning_consistency=f"{metrics.learning_consistency:.1f}",
            peak_focus_time=metrics.peak_focus_time,
            focus_score=f"{metrics.focus_score:.1f}",
            trend=metrics.trend,
            updated_at=datetime.now(timezone.utc),
        )

    await _ensure_tables()
    init_pg()
    if async_session_factory is None:
        raise HTTPException(status_code=500, detail="Progress DB session factory not initialized.")

    async with async_session_factory() as session:  # type: ignore[misc]
        row = await session.scalar(select(Progress).where(Progress.user_id == req.user_id))
        if not row:
            row = Progress(user_id=req.user_id)
            session.add(row)

        if req.recompute:
            metrics = await _compute_for_user(req.user_id)
            row.learning_consistency = metrics.learning_consistency
            row.peak_focus_time = metrics.peak_focus_time
            row.focus_score = metrics.focus_score
            row.trend = metrics.trend
            row.trend_detail = metrics.trend_detail

        row.updated_at = datetime.now(timezone.utc)
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update progress: {e}")

        await session.refresh(row)
        return _as_progress_response(
            row.user_id,
            learning_consistency=f"{float(row.learning_consistency):.1f}",
            peak_focus_time=row.peak_focus_time,
            focus_score=f"{float(row.focus_score):.1f}",
            trend=row.trend,
            updated_at=row.updated_at,
        )

