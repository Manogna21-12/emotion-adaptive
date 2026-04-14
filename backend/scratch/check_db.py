import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    MONGO_URI = "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client['emotion_learning']
    
    # Check Quizzes
    count = await db['adaptive_quizzes'].count_documents({})
    print(f"COLLECTION COUNT: {count}")
    
    if count > 0:
        first = await db['adaptive_quizzes'].find_one()
        print(f"FIRST DOCUMENT: {first}")
        
    # Check Lessons
    lesson_count = await db['lessons'].count_documents({})
    print(f"LESSON COUNT: {lesson_count}")
    if lesson_count > 0:
        first_lesson = await db['lessons'].find_one()
        print(f"FIRST LESSON ID: {first_lesson['_id']}")

if __name__ == "__main__":
    asyncio.run(check())
