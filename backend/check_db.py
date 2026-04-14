import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_db():
    client = AsyncIOMotorClient("mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0")
    db = client["emotion_learning"]
    
    users = await db["users"].find().to_list(10)
    print("\n--- USERS ---")
    for u in users:
        print(f"ID: {str(u['_id'])}, Name: {u.get('name')}")
        
    stats = await db["userstats"].find().to_list(10)
    print("\n--- USERSTATS ---")
    for s in stats:
        print(f"UserID: {s.get('user_id') or s.get('userId')}, Topics: {s.get('completed_topics')}")

if __name__ == "__main__":
    asyncio.run(check_db())
