"""Quizzes API: GET sample questions, POST quiz attempt results (SQLite)."""

from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from pg_db import get_session
from pg_models import QuizResult

# Ensure model is registered on Base.metadata before create_all runs elsewhere
_ = QuizResult  # noqa: F841

router = APIRouter(prefix="/api", tags=["quizzes"])

SAMPLE_QUIZZES: List[dict[str, Any]] = [
    {
        "id": 1,
        "question": "What is 2 + 2?",
        "options": [
            {"text": "2", "isCorrect": False},
            {"text": "3", "isCorrect": False},
            {"text": "4", "isCorrect": True},
            {"text": "5", "isCorrect": False},
        ],
    },
    {
        "id": 2,
        "question": "Capital of India?",
        "options": [
            {"text": "Delhi", "isCorrect": True},
            {"text": "Mumbai", "isCorrect": False},
            {"text": "Chennai", "isCorrect": False},
            {"text": "Kolkata", "isCorrect": False},
        ],
    },
]


@router.get("/quizzes")
def get_quizzes() -> List[dict[str, Any]]:
    return SAMPLE_QUIZZES


class QuizResultIn(BaseModel):
    userId: str
    score: int = Field(ge=0)
    totalQuestions: int = Field(ge=0)
    timestamp: Optional[str] = None


@router.post("/quiz-result")
async def save_quiz_result(
    body: QuizResultIn,
    session: AsyncSession = Depends(get_session),
):
    row = QuizResult(
        user_id=body.userId,
        score=body.score,
        total_questions=body.totalQuestions,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {
        "ok": True,
        "id": row.id,
        "userId": row.user_id,
        "score": row.score,
        "totalQuestions": row.total_questions,
        "savedAt": row.created_at.isoformat() if row.created_at else None,
    }
