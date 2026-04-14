import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def create_coll():
    MONGO_URI = "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client['emotion_learning']
    
    # Try creating collection explicitly, it creates immediately even if empty
    try:
        await db.create_collection("feedback")
        print("Feedback collection created successfully!")
    except Exception as e:
        print("Note:", e)

if __name__ == "__main__":
    asyncio.run(create_coll())
