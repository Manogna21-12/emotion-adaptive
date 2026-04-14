from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import smart_reader_collection, reader_emotion_logs_collection
from bson import ObjectId

router = APIRouter(prefix="/reader", tags=["smart-reader"])

class Article(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    category: str
    difficulty: str
    read_time: int
    image_url: Optional[str] = None
    pdf_url: Optional[str] = None

class EmotionTrack(BaseModel):
    user_id: str
    document_id: str
    emotion: str
    confidence: float
    timestamp: datetime = datetime.utcnow()

@router.get("/articles", response_model=List[Article])
async def get_articles():
    articles = await smart_reader_collection.find().to_list(100)
    for article in articles:
        article["id"] = str(article["_id"])
    return articles

@router.get("/article/{article_id}", response_model=Article)
async def get_article(article_id: str):
    article = await smart_reader_collection.find_one({"_id": ObjectId(article_id)})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article["id"] = str(article["_id"])
    return article

@router.post("/track-emotion")
@router.post("/api/reader-emotion")
async def track_emotion(data: EmotionTrack):
    print(f"DEBUG: track_emotion called for user={data.user_id}, doc={data.document_id}, emotion={data.emotion}")
    log_data = data.dict()
    log_data["timestamp"] = datetime.utcnow()
    # Support different key names that frontend might use
    log_data["focus_score"] = data.confidence
    
    result = await reader_emotion_logs_collection.insert_one(log_data)
    print(f"DEBUG: Inserted into reader_emotion_logs: {result.inserted_id}")
    
    seconds_to_add = 3 # Throttled interval in frontend is 3s
    
    # Update userstats (all-time reader focus)
    from database import userstats_collection
    await userstats_collection.update_one(
        {"user_id": data.user_id},
        {"$inc": {"reader_time_seconds": seconds_to_add}},
        upsert=True
    )
    
    await smart_reader_collection.update_one(
        {"_id": ObjectId(data.document_id)},
        {"$inc": {"total_engagement_seconds": seconds_to_add}}
    )
    
    return {"status": "success", "id": str(result.inserted_id)}

@router.get("/stats/{user_id}/{document_id}")
@router.get("/api/reader-stats")
async def get_stats(user_id: str, document_id: str = None):
    # document_id can be passed as query param for /api/reader-stats
    if not document_id:
        return {"error": "document_id required"}
        
    print(f"DEBUG: get_stats for user={user_id}, doc={document_id}")
    
    logs = await reader_emotion_logs_collection.find({
        "user_id": user_id,
        "document_id": document_id
    }).sort("timestamp", -1).to_list(1000)
    
    if not logs:
        print("DEBUG: No logs found for stats")
        return {
            "avg_focus": 0, 
            "dominant_emotion": "neutral", 
            "time_spent": "0m 0s",
            "retention": 0,
            "retention_score": 0,
            "logs_count": 0
        }
    
    # Focus logic: concentrated emotions relative to total
    focused_logs = [log for log in logs if log.get("emotion", "neutral").lower() in ["happy", "neutral", "surprise"]]
    avg_focus = int((len(focused_logs) / len(logs)) * 100) if logs else 0
    
    emotions = [log.get("emotion", "neutral") for log in logs]
    dominant_emotion = max(set(emotions), key=emotions.count) if emotions else "neutral"
    
    # Time spent tracking
    total_seconds = len(logs) * 3 
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    
    # Retention Score: (avg_focus * 0.6) + (time_spent_weight * 0.4)
    article = await smart_reader_collection.find_one({"_id": ObjectId(document_id)})
    read_time_goal = article.get("read_time", 5) * 60 if article else 300
    time_weight = min(100, (total_seconds / read_time_goal) * 100)
    
    retention = int((avg_focus * 0.6) + (time_weight * 0.4))
    
    print(f"DEBUG: Stats computed: focus={avg_focus}, retention={retention}, time={minutes}m {seconds}s")
    
    return {
        "avg_focus": avg_focus,
        "dominant_emotion": dominant_emotion,
        "time_spent": f"{minutes}m {seconds}s",
        "retention": retention,
        "retention_score": retention, # compatibility
        "logs_count": len(logs)
    }

# Seed articles if empty
@router.post("/seed")
async def seed_articles():
    # Clear existing to ensure PDF links are applied
    await smart_reader_collection.delete_many({})
    
    seed_data = [
        {
            "title": "Arrays & Data Structures",
            "content": "Arrays are among the oldest and most important data structures, and are used by almost every program.",
            "category": "Computer Science",
            "difficulty": "Beginner",
            "read_time": 5,
            "image_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4",
            "pdf_url": "https://drive.google.com/file/d/1Xy8G7Yc6Zp6Q_F-p_p_p_p_p_p_p_p/view?usp=sharing" # Sample
        },
        {
            "title": "Introduction to Quantum Computing",
            "content": "Quantum computing is a type of computation whose operations can harness the phenomena of quantum mechanics...",
            "category": "Technology",
            "difficulty": "Advanced",
            "read_time": 10,
            "image_url": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb",
            "pdf_url": "https://www.adobe.com/support/products/enterprise/knowledgecenter/whitepapers/pdf/quantum_computing.pdf"
        },
        {
            "title": "React Architecture & Patterns",
            "content": "React is a JavaScript library for building user interfaces. It is maintained by Meta and a community of individual developers...",
            "category": "Web Dev",
            "difficulty": "Intermediate",
            "read_time": 8,
            "image_url": "https://images.unsplash.com/photo-1633356122544-f134324a6cee",
            "pdf_url": "https://drive.google.com/file/d/1m5XqP6Y3E2mS7h9k_T_T_T_T_T_T_T/view?usp=sharing"
        }
    ]
    await smart_reader_collection.insert_many(seed_data)
    return {"message": "Articles seeded successfully with PDF links"}
