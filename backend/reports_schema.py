"""
Reports Collection Schema and Index Setup
"""
from database import reports_collection
from pymongo import ASCENDING, DESCENDING
import asyncio

async def create_reports_schema():
    """Create reports collection with proper schema and indexes"""
    
    # Create indexes for optimal performance
    indexes = [
        # Compound index for user queries with sorting
        [("user_id", ASCENDING), ("generated_at", DESCENDING)],
        # Index for file path lookups
        [("report_file_path", ASCENDING)],
        # Index for generated_at queries
        [("generated_at", DESCENDING)]
    ]
    
    try:
        # Create indexes
        for index in indexes:
            await reports_collection.create_index(index)
            print(f"Created index: {index}")
        
        print("✅ Reports collection schema and indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error creating reports schema: {e}")
        raise e

# Sample report document structure
REPORT_SCHEMA = {
    "_id": "ObjectId",
    "user_id": "string",
    "generated_at": "datetime",
    "time_spent_minutes": "number",
    "avg_focus": "number", 
    "lessons_completed": "number",
    "consistency_score": "number",
    "peak_focus_time": "string",
    "emotion_distribution": {
        "happy": "number",
        "neutral": "number", 
        "sad": "number",
        "angry": "number",
        "focused": "number",
        "confused": "number",
        "surprise": "number",
        "fear": "number",
        "disgust": "number"
    },
    "report_file_path": "string",
    "total_sessions": "number",
    "peak_focus_avg": "number"
}

if __name__ == "__main__":
    asyncio.run(create_reports_schema())
