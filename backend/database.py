from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0",
)

# Timeouts avoid "hangs" when Mongo is unreachable.
client = AsyncIOMotorClient(
    MONGO_URI,
    serverSelectionTimeoutMS=int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000")),
    connectTimeoutMS=int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "5000")),
)

db = client["emotion_learning"]
users_collection = db["users"]
# Collections referenced by route modules.
modules_collection = db["modules"]
userstats_collection = db["userstats"]
user_stats_collection = db["userstdts"]
courses_collection = db["courses"]
lessons_collection = db["lessons"]
videos_collection = db["videos"]
emotion_logs_collection = db["emotion_logs"]
notifications_collection = db["notifications"]
learning_sessions_collection = db["learning_sessions"]
smart_reader_collection = db["smart_reader"]
reader_emotion_logs_collection = db["reader_emotion_logs"]
adaptive_quizzes_collection = db["adaptive_quizzes"]
quiz_attempts_collection = db["quiz_attempts"]
feedback_collection = db["feedback"]

# Ensure unique index for login speed
async def init_db_indexes():
    await users_collection.create_index("email", unique=True)
    await emotion_logs_collection.create_index([("user_id", 1), ("timestamp", -1)])
    await emotion_logs_collection.create_index([("userId", 1), ("timestamp", -1)])
    await notifications_collection.create_index([("user_id", 1), ("created_at", -1)])
    await reader_emotion_logs_collection.create_index([("user_id", 1), ("timestamp", -1)])
    await feedback_collection.create_index([("user_id", 1), ("created_at", -1)])
    await feedback_collection.create_index([("course_id", 1), ("lesson_id", 1)])
    
    # Adaptive quiz indexes
    await adaptive_quizzes_collection.create_index([("course_id", 1), ("difficulty", 1)])
    await adaptive_quizzes_collection.create_index([("lesson_id", 1), ("difficulty", 1)])
    await quiz_attempts_collection.create_index([("user_id", 1), ("timestamp", -1)])
    print("[db] Adaptive quiz and Smart Reader indexes created")


