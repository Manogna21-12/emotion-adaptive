import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def run():
    uri = os.getenv("MONGO_URI", "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0")
    print(f"Connecting to: {uri.split('@')[1] if '@' in uri else uri}")
    client = AsyncIOMotorClient(uri)
    db = client["emotion_learning"]
    count = await db["courses"].count_documents({})
    print(f"Courses Found: {count}")
    
    if count == 0:
        print("No courses found! Seeding sample courses...")
        sample_courses = [
            {
                "title": "Machine Learning Fundamentals",
                "level": "Intermediate",
                "duration": "4 weeks",
                "description": "Learn the basics of ML and deep learning."
            },
            {
                "title": "Fullstack Web Development",
                "level": "Beginner",
                "duration": "8 weeks",
                "description": "Build modern apps with React and FastAPI."
            },
            {
                "title": "Data Science with Python",
                "level": "Beginner",
                "duration": "6 weeks",
                "description": "Analyze data like a pro."
            }
        ]
        await db["courses"].insert_many(sample_courses)
        print("Sample courses seeded.")
    else:
        sample = await db["courses"].find_one({})
        print(f"Sample Course: {sample}")

if __name__ == "__main__":
    asyncio.run(run())
