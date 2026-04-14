from pymongo import MongoClient
import sys

MONGO_URI = "mongodb+srv://admin:Srmsrm41@cluster0.krcjqms.mongodb.net/?appName=Cluster0"

def seed_db():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.server_info()
        print("Connected to MongoDB")
    except Exception as e:
        print("MongoDB connection failed:", e)
        sys.exit(1)

    db = client["emotion_learning"]
    courses_collection = db["courses"]
    lessons_collection = db["lessons"]
    videos_collection = db["videos"]

    # Clear existing data for a fresh start
    courses_collection.delete_many({})
    lessons_collection.delete_many({})
    videos_collection.delete_many({})

    # 1. Insert Courses
    courses = [
        {
            "_id": "course_quantum",
            "title": "Quantum Computing Basics",
            "description": "Learn the fundamentals of quantum mechanics and computing paradigms."
        },
        {
            "_id": "course_react",
            "title": "Advanced React Patterns",
            "description": "Master hooks, context, and state management for scalable apps."
        },
        {
            "_id": "course_emotionai",
            "title": "Emotion AI Architecture",
            "description": "Building adaptive AI systems using facial expression recognition."
        }
    ]
    courses_collection.insert_many(courses)
    print("Inserted courses.")

    # 2. Insert Lessons
    lessons = [
        # Quantum lessons
        {"_id": "lesson_qc_1", "course_id": "course_quantum", "title": "Lesson 1: Introduction to Qubits", "order": 1},
        {"_id": "lesson_qc_2", "course_id": "course_quantum", "title": "Lesson 2: Superposition & Entanglement", "order": 2},
        {"_id": "lesson_qc_3", "course_id": "course_quantum", "title": "Lesson 3: Quantum Gates", "order": 3},
        # React lessons
        {"_id": "lesson_react_1", "course_id": "course_react", "title": "Lesson 1: Context API Deep Dive", "order": 1},
        # Emotion AI lessons
        {"_id": "lesson_emotionai_1", "course_id": "course_emotionai", "title": "Lesson 1: Haar Cascades vs DeepFace", "order": 1},
    ]
    lessons_collection.insert_many(lessons)
    print("Inserted lessons.")

    # 3. Insert Videos
    videos = [
        # Quantum videos
        {
            "_id": "video_qc_1", 
            "lesson_id": "lesson_qc_1", 
            "title": "Introduction to Qubits", 
            "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", 
            "duration": "10:00", 
            "level": "Beginner"
        },
        {
            "_id": "video_qc_2", 
            "lesson_id": "lesson_qc_2", 
            "title": "Superposition & Entanglement", 
            "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", 
            "duration": "15:00", 
            "level": "Intermediate"
        },
        {
            "_id": "video_qc_3", 
            "lesson_id": "lesson_qc_3", 
            "title": "Quantum Gates", 
            "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", 
            "duration": "20:00", 
            "level": "Advanced"
        },
        # React videos
        {
            "_id": "video_react_1", 
            "lesson_id": "lesson_react_1", 
            "title": "Context API Deep Dive", 
            "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", 
            "duration": "12:00", 
            "level": "Intermediate"
        },
        # Emotion AI
        {
            "_id": "video_emotion_1", 
            "lesson_id": "lesson_emotionai_1", 
            "title": "Haar Cascades vs DeepFace", 
            "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", 
            "duration": "18:00", 
            "level": "Advanced"
        }
    ]
    videos_collection.insert_many(videos)
    print("Inserted videos.")

    print("Database successfully seeded!")

if __name__ == "__main__":
    seed_db()
