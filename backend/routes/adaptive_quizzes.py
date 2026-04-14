from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from database import adaptive_quizzes_collection, quiz_attempts_collection

router = APIRouter(
    prefix="/api/adaptive",
    tags=["Adaptive Quiz"]
)

class QuizQuestion(BaseModel):
    id: str
    course_id: str
    module_id: str
    lesson_id: str
    topic: str
    difficulty: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None

class QuizAttempt(BaseModel):
    user_id: str
    question_id: str
    selected_answer: str
    is_correct: bool
    emotion: str
    focus_score: float
    timestamp: datetime = datetime.utcnow()

@router.get("/quiz")
async def get_adaptive_quiz(
    course_id: Optional[str] = None,
    module_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: str = "medium"
):
    """
    Fetches a random quiz question based on filters and difficulty.
    Falls back to MEDIUM difficulty if specific difficulty is not found.
    """
    query = {}
    
    # Step 1: Identify context
    if course_id and course_id != "undefined": query["course_id"] = course_id
    if module_id and module_id != "undefined": query["module_id"] = module_id
    if lesson_id and lesson_id != "undefined": query["lesson_id"] = lesson_id
    
    # Step 2: Difficulty handled by caller
    # Step 3: Initial Query
    if topic and topic != "undefined": 
        query["topic"] = {"$regex": f"^{topic}$", "$options": "i"}
    query["difficulty"] = difficulty

    print(f"[DEBUG] Quiz Request: Lesson={lesson_id}, Topic={topic}, Diff={difficulty}")
    
    async def run_query(q):
        print(f"[DEBUG] Attempting Query: {q}")
        pipeline = [{"$match": q}, {"$sample": {"size": 1}}]
        cursor = adaptive_quizzes_collection.aggregate(pipeline)
        res = await cursor.to_list(length=1)
        print(f"[DEBUG] Results found: {len(res)}")
        return res

    # ---------------------------------------------------------
    # TIERED SEARCH ARCHITECTURE (Ensures quiz works on all videos)
    # ---------------------------------------------------------

    # 1. Primary Attempt (Full Context: Topic + Difficulty + Lesson ID)
    results = await adaptive_quizzes_collection.find(query).to_list(length=100)
    
    # 2. Fallback: Topic Title Match (Bridges dummy ID data)
    if not results and topic and topic != "undefined":
        print(f"[TIER 2] Searching by Topic Title: '{topic}'...")
        t_query = {"topic": {"$regex": f"^{topic}$", "$options": "i"}, "difficulty": difficulty}
        results = await adaptive_quizzes_collection.find(t_query).to_list(length=100)
        
        if not results:
            t_query["difficulty"] = "medium"
            results = await adaptive_quizzes_collection.find(t_query).to_list(length=100)

    # 3. Fallback: Broad Lesson Match (Any topic in THIS lesson)
    if not results and "lesson_id" in query:
        print(f"[TIER 3] Broadening to any question in Lesson {lesson_id}...")
        l_query = {"lesson_id": lesson_id}
        results = await adaptive_quizzes_collection.find(l_query).to_list(length=100)

    # 4. Fallback: Module Match (Any question in THIS module)
    if not results and "module_id" in query:
        print(f"[TIER 4] Broadening to any question in Module {module_id}...")
        m_query = {"module_id": module_id}
        results = await adaptive_quizzes_collection.find(m_query).to_list(length=100)

    # 5. Fallback: Course Match (Any question in THIS course)
    if not results and "course_id" in query:
        print(f"[TIER 5] Broadening to any question in Course {course_id}...")
        c_query = {"course_id": course_id}
        results = await adaptive_quizzes_collection.find(c_query).to_list(length=100)

    # 6. Safety Net: General Topic Fetch (Ensures ALL videos have quizzes)
    if not results:
        print(f"[TIER 6] No contextual data found. Fetching high-quality general questions...")
        results = await adaptive_quizzes_collection.find({"topic": "General"}).to_list(length=100)

    # 7. Final Resort: Any random question (The "Never Fail" rule)
    if not results:
        print("[TIER 7] Urgent Fallback: Random global fetch...")
        cursor = adaptive_quizzes_collection.aggregate([{"$sample": {"size": 20}}])
        results = await cursor.to_list(length=20)

    if not results:
        return {"error": "No questions found. Please check database connectivity."}

    import random
    q = random.choice(results)
    print(f"[SUCCESS] Selected question ID: {q.get('_id')} (Source Tier reached)")

    return {
        "id": str(q["_id"]),
        "question": q["question"],
        "options": q["options"],
        "correct_answer": q.get("correct_answer", ""),
        "difficulty": q.get("difficulty", "medium"),
        "topic": q.get("topic", "General"),
        "explanation": q.get("explanation", "")
    }

@router.post("/quiz-attempt")
async def submit_quiz_attempt(attempt: QuizAttempt):
    """
    Stores a quiz attempt in the database.
    """
    try:
        doc = attempt.dict()
        doc["timestamp"] = datetime.utcnow()
        result = await quiz_attempts_collection.insert_one(doc)
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
async def seed_quizzes():
    """
    Seeds sample quizzes for testing.
    """
    samples = [
        {
            "course_id": "course_1",
            "module_id": "mod_1",
            "lesson_id": "less_1",
            "topic": "General",
            "difficulty": "easy",
            "question": "What is the capital of France?",
            "options": ["London", "Berlin", "Paris", "Madrid"],
            "correct_answer": "Paris"
        },
        {
            "course_id": "course_1",
            "module_id": "mod_1",
            "lesson_id": "less_1",
            "topic": "General",
            "difficulty": "medium",
            "question": "Which planet is known as the Red Planet?",
            "options": ["Venus", "Mars", "Jupiter", "Saturn"],
            "correct_answer": "Mars"
        },
        {
            "course_id": "course_1",
            "module_id": "mod_1",
            "lesson_id": "less_1",
            "topic": "General",
            "difficulty": "hard",
            "question": "What is the molecular weight of Caffeine?",
            "options": ["194.19 g/mol", "180.16 g/mol", "150.10 g/mol", "200.25 g/mol"],
            "correct_answer": "194.19 g/mol"
        }
    ]
    
    await adaptive_quizzes_collection.insert_many(samples)
    return {"message": "Sample quizzes seeded"}
