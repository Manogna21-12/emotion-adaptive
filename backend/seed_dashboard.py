import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import random

MONGO_URI = "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0"
client = AsyncIOMotorClient(MONGO_URI)
db = client["emotion_learning"]
emotion_logs_collection = db["emotion_logs"]
userstats_collection = db["userstats"]

async def seed_dashboard_data():
    # Get a sample user (or use a fixed one if known)
    user = await db["users"].find_one({})
    if not user:
        print("No user found to seed data for.")
        return
    
    user_id = str(user["_id"])
    print(f"Seeding data for user: {user_id}")

    # 1. Create emotion logs for today
    today = datetime.utcnow()
    emotions = ["happy", "neutral", "surprise", "sad", "angry"]
    
    logs = []
    lesson_ids = [f"lesson_{i}" for i in range(1, 13)] # 12 unique lessons
    for i in range(20):
        ts = today - timedelta(minutes=i*15)
        emotion = random.choice(emotions)
        focus = random.randint(51, 95) if emotion in ["happy", "neutral"] else random.randint(10, 50)
        
        logs.append({
            "user_id": user_id,
            "userId": user_id,
            "lesson_id": lesson_ids[i % len(lesson_ids)],
            "emotion": emotion,
            "focus": focus,
            "timestamp": ts
        })
    
    await emotion_logs_collection.delete_many({"user_id": user_id})
    await emotion_logs_collection.delete_many({"userId": user_id})
    await emotion_logs_collection.insert_many(logs)
    print(f"Inserted {len(logs)} emotion logs.")

    # 2. Update userstats for topics mastered
    await userstats_collection.delete_many({"user_id": user_id})
    await userstats_collection.delete_many({"userId": user_id})
    
    await userstats_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "userId": user_id, 
            "completed_topics": 12, 
            "current_streak": 5
        }},
        upsert=True
    )
    print("Updated userstats.")

if __name__ == "__main__":
    asyncio.run(seed_dashboard_data())
