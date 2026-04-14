import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Connection details
MONGO_URI = "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0"
DB_NAME = "emotion_learning"

async def insert_samples():
    print(f"Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db["adaptive_quizzes"]

    # Clear existing to ensure we see our test questions
    # await collection.delete_many({}) 
    
    samples = [
        {
            "course_id": "default",
            "module_id": "test-module",
            "lesson_id": "test-lesson",
            "topic": "General Knowledge",
            "difficulty": "easy",
            "question": "Which of these is a primary color?",
            "options": ["Red", "Green", "Orange", "Purple"],
            "correct_answer": "Red",
            "explanation": "Red, Blue, and Yellow are the primary colors.",
            "created_at": datetime.utcnow()
        },
        {
            "course_id": "default",
            "module_id": "test-module",
            "lesson_id": "test-lesson",
            "topic": "General Knowledge",
            "difficulty": "medium",
            "question": "What is the capital of France?",
            "options": ["London", "Berlin", "Paris", "Madrid"],
            "correct_answer": "Paris",
            "explanation": "Paris is the capital and most populous city of France.",
            "created_at": datetime.utcnow()
        },
        {
            "course_id": "default",
            "module_id": "test-module",
            "lesson_id": "test-lesson",
            "topic": "General Knowledge",
            "difficulty": "hard",
            "question": "Which planet is known as the Red Planet?",
            "options": ["Venus", "Mars", "Jupiter", "Saturn"],
            "correct_answer": "Mars",
            "explanation": "Mars is often called the 'Red Planet' because of iron oxide on its surface.",
            "created_at": datetime.utcnow()
        }
    ]

    print(f"Inserting {len(samples)} sample questions into '{DB_NAME}.adaptive_quizzes'...")
    result = await collection.insert_many(samples)
    print(f"Successfully inserted with IDs: {result.inserted_ids}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(insert_samples())
