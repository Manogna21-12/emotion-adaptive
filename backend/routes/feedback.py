from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import db

router = APIRouter(prefix="/feedback", tags=["Feedback"])

class FeedbackModel(BaseModel):
    user_id: str
    lesson_id: str
    module_id: str
    rating: int              # 1–5
    understanding_level: str # "easy" | "medium" | "difficult"
    comment: Optional[str] = None

@router.post("")
async def save_feedback(feedback: FeedbackModel):
    """Save lesson feedback after video completion."""
    data = feedback.dict()
    data["timestamp"] = datetime.utcnow()
    await db["lesson_feedback"].insert_one(data)
    return {"message": "Feedback saved successfully"}

@router.get("/lesson/{lesson_id}")
async def get_lesson_feedback(lesson_id: str):
    """Get all feedback for a specific lesson (optional analytics use)."""
    cursor = db["lesson_feedback"].find({"lesson_id": lesson_id}, {"_id": 0})
    docs = await cursor.to_list(length=100)
    return {"feedback": docs}
