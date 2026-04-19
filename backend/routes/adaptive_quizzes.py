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
    difficulty: str = "medium",
    exclude_ids: Optional[List[str]] = Query(None)
):
    """
    Fetches a random quiz question based on filters and difficulty.
    Prevents repetition by excluding IDs in exclude_ids.
    """
    query = {}
    
    # Identify context
    if course_id and course_id != "undefined": query["course_id"] = course_id
    if module_id and module_id != "undefined": query["module_id"] = module_id
    if lesson_id and lesson_id != "undefined": query["lesson_id"] = lesson_id
    
    if topic and topic != "undefined": 
        query["topic"] = {"$regex": f"^{topic}$", "$options": "i"}
    query["difficulty"] = difficulty

    # Add exclusion filter if provided
    exclude_list = []
    if exclude_ids:
        exclude_list = [ObjectId(eid) for eid in exclude_ids if ObjectId.is_valid(eid)]
        if exclude_list:
            query["_id"] = {"$nin": exclude_list}

    print(f"[DEBUG] Quiz Request: Lesson={lesson_id}, Topic={topic}, Diff={difficulty}, ExcludeCount={len(exclude_list)}")
    
    # 1. Primary Attempt (Full Context: Topic + Difficulty + Lesson ID)
    results = await adaptive_quizzes_collection.find(query).to_list(length=100)
    
    # Helper to filter results manually to catch any edge cases (e.g. mixed string/ObjectId)
    def filter_reps(q_list):
        if not exclude_ids: return q_list
        return [q for q in q_list if str(q["_id"]) not in exclude_ids]

    results = filter_reps(results)
    
    # 2. Fallback: Topic Title Match (Bridges dummy ID data)
    if not results and topic and topic != "undefined":
        t_query = {"topic": {"$regex": f"^{topic}$", "$options": "i"}, "difficulty": difficulty}
        if exclude_list: t_query["_id"] = {"$nin": exclude_list}
        results = await adaptive_quizzes_collection.find(t_query).to_list(length=100)
        
        if not results:
            t_query["difficulty"] = "medium"
            results = await adaptive_quizzes_collection.find(t_query).to_list(length=100)
        
        results = filter_reps(results)

    # 3. Fallback: Broad Lesson Match (Any topic in THIS lesson)
    if not results and "lesson_id" in query:
        l_query = {"lesson_id": lesson_id}
        if exclude_list: l_query["_id"] = {"$nin": exclude_list}
        results = await adaptive_quizzes_collection.find(l_query).to_list(length=100)
        results = filter_reps(results)

    # 4. Fallback: Module/Course Match
    if not results and "module_id" in query:
        m_query = {"module_id": module_id}
        if exclude_list: m_query["_id"] = {"$nin": exclude_list}
        results = await adaptive_quizzes_collection.find(m_query).to_list(length=100)
        results = filter_reps(results)

    # 5. Safety Net: General/Global random fetch
    if not results:
        fallback_query = {"topic": "General"}
        if exclude_list: fallback_query["_id"] = {"$nin": exclude_list}
        results = await adaptive_quizzes_collection.find(fallback_query).to_list(length=100)
        results = filter_reps(results)

    if not results:
        # Final Resort: Any random question excluding current session IDs
        final_query = {}
        if exclude_list: final_query["_id"] = {"$nin": exclude_list}
        cursor = adaptive_quizzes_collection.aggregate([{"$match": final_query}, {"$sample": {"size": 20}}])
        results = await cursor.to_list(length=20)
        results = filter_reps(results)

    if not results:
        return {"error": "No more unique questions available in this session."}

    import random
    q = random.choice(results)
    
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
