from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from database import smart_reader_collection, reader_emotion_logs_collection, emotion_logs_collection
from models import ReaderEmotionLog
from bson import ObjectId

router = APIRouter(prefix="/smart-reader", tags=["Smart Reader"])

def serialize_mongo(doc):
    if not doc: return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("", response_model=List[dict])
async def get_concepts():
    cursor = smart_reader_collection.find({})
    concepts = await cursor.to_list(length=100)
    
    # Seed if empty or refresh with PDF links
    if not concepts:
        sample_pdfs = [
            {
                "title": "Machine Learning Basics (PDF)",
                "description": "Introduction to ML algorithms and concepts.",
                "link": "https://drive.google.com/file/d/1Xy_Jp_Kq9_eO_e/preview",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Python for Data Science (PDF)",
                "description": "Comprehensive guide to Python in Data Science.",
                "link": "https://drive.google.com/file/d/1_abc_123/preview",
                "created_at": datetime.utcnow()
            }
        ]
        await smart_reader_collection.insert_many(sample_pdfs)
        concepts = sample_pdfs
        
    return [serialize_mongo(c) for c in concepts]

@router.post("/track-emotion")
async def track_reader_emotion(log: ReaderEmotionLog):
    log_data = log.dict()
    log_data["timestamp"] = datetime.utcnow()
    await reader_emotion_logs_collection.insert_one(log_data)
    return {"status": "success"}

@router.get("/stats")
async def get_reader_stats(user_id: str, concept_id: Optional[str] = None):
    query = {"user_id": user_id}
    if concept_id:
        query["concept_id"] = concept_id
        
    cursor = reader_emotion_logs_collection.find(query)
    logs = await cursor.to_list(length=2000)
    
    if not logs:
        return {"timeSpent": 0, "avgFocus": 0, "retentionScore": 0}
        
    total_duration = sum(log.get("duration", 0) for log in logs)
    
    focus_map = {
        "happy": 95, "neutral": 85, "surprise": 80,
        "sad": 40, "angry": 30, "fear": 35, "disgust": 20, "no_face": 0
    }
    
    total_focus = 0
    for log in logs:
        emo = log.get("emotion", "neutral").lower()
        total_focus += focus_map.get(emo, 70)
        
    avg_focus = total_focus / len(logs) if logs else 0
    # Simple retention score logic based on high focus emotions
    retention_score = min(100, avg_focus * 1.1) 
    
    return {
        "timeSpent": total_duration,
        "avgFocus": round(avg_focus, 1),
        "retentionScore": round(retention_score, 1)
    }

@router.get("/learning-stats")
async def get_learning_stats(user_id: str):
    # Fetch from original emotion_logs
    cursor = emotion_logs_collection.find({"user_id": user_id})
    logs = await cursor.to_list(length=2000)
    
    if not logs:
        return {"avgEmotion": "neutral", "retentionScore": 0}
        
    emotions = [log.get("emotion", "neutral") for log in logs]
    most_common_emotion = max(set(emotions), key=emotions.count) if emotions else "neutral"
    
    focus_map = {
        "happy": 95, "neutral": 85, "surprise": 80,
        "sad": 40, "angry": 30, "fear": 35, "disgust": 20, "no_face": 0
    }
    total_focus = sum(focus_map.get(emo.lower(), 70) for emo in emotions)
    avg_focus = total_focus / len(logs) if logs else 0
    
    return {
        "avgEmotion": most_common_emotion,
        "retentionScore": round(avg_focus, 1)
    }
