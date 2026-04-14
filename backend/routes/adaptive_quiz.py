"""Adaptive Quiz API — emotion-driven quiz system.

Endpoints:
  GET  /adaptive-quiz/questions   — fetch questions by course/lesson/difficulty
  POST /adaptive-quiz/submit      — submit an answer attempt
  GET  /adaptive-quiz/stats        — per-user quiz performance stats
  POST /adaptive-quiz/seed         — (admin) seed sample questions
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from database import adaptive_quizzes_collection, quiz_attempts_collection
from models import QuizQuestionCreate, QuizAttemptCreate

router = APIRouter(prefix="/adaptive-quiz", tags=["Adaptive Quiz"])


def _serialize(doc):
    """Convert MongoDB doc to JSON-safe dict."""
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ─── Seed sample questions (auto-called if collection is empty) ──────────────

SEED_QUESTIONS = [
    # ── Easy ──
    {
        "course_id": "emotion-ai-architecture",
        "module_id": "", "lesson_id": "", "topic": "Emotion AI",
        "difficulty": "easy",
        "question": "What does AI stand for?",
        "options": ["Artificial Intelligence", "Automated Input", "Advanced Integration", "Audio Interface"],
        "correct_answer": "Artificial Intelligence",
        "explanation": "AI stands for Artificial Intelligence — systems that mimic human cognitive functions."
    },
    {
        "course_id": "emotion-ai-architecture",
        "module_id": "", "lesson_id": "", "topic": "Emotion AI",
        "difficulty": "easy",
        "question": "Which human sense is most commonly used in emotion detection?",
        "options": ["Vision", "Smell", "Taste", "Touch"],
        "correct_answer": "Vision",
        "explanation": "Computer vision analyzes facial expressions, the primary channel for automated emotion detection."
    },
    {
        "course_id": "neural-networks-101",
        "module_id": "", "lesson_id": "", "topic": "Neural Networks",
        "difficulty": "easy",
        "question": "What is a neural network inspired by?",
        "options": ["Human brain", "Solar system", "Internet", "Spreadsheet"],
        "correct_answer": "Human brain",
        "explanation": "Neural networks are computing systems loosely inspired by biological neural networks in the brain."
    },
    # ── Medium ──
    {
        "course_id": "emotion-ai-architecture",
        "module_id": "", "lesson_id": "", "topic": "Emotion AI",
        "difficulty": "medium",
        "question": "Which library is commonly used for facial emotion detection in Python?",
        "options": ["DeepFace", "Pandas", "Flask", "SQLAlchemy"],
        "correct_answer": "DeepFace",
        "explanation": "DeepFace is a lightweight face recognition and emotion analysis library for Python."
    },
    {
        "course_id": "emotion-ai-architecture",
        "module_id": "", "lesson_id": "", "topic": "Emotion AI",
        "difficulty": "medium",
        "question": "How many basic emotions does the Ekman model define?",
        "options": ["4", "6", "8", "10"],
        "correct_answer": "6",
        "explanation": "Paul Ekman identified 6 basic emotions: happiness, sadness, fear, disgust, anger, and surprise."
    },
    {
        "course_id": "neural-networks-101",
        "module_id": "", "lesson_id": "", "topic": "Neural Networks",
        "difficulty": "medium",
        "question": "What is the purpose of an activation function?",
        "options": [
            "Introduce non-linearity",
            "Store data",
            "Connect to the internet",
            "Format output"
        ],
        "correct_answer": "Introduce non-linearity",
        "explanation": "Activation functions introduce non-linearity so networks can learn complex patterns."
    },
    {
        "course_id": "advanced-react-patterns",
        "module_id": "", "lesson_id": "", "topic": "React",
        "difficulty": "medium",
        "question": "What hook is used to manage side effects in React?",
        "options": ["useEffect", "useState", "useRef", "useMemo"],
        "correct_answer": "useEffect",
        "explanation": "useEffect lets you perform side effects like data fetching and subscriptions."
    },
    # ── Hard ──
    {
        "course_id": "emotion-ai-architecture",
        "module_id": "", "lesson_id": "", "topic": "Emotion AI",
        "difficulty": "hard",
        "question": "Which deep learning architecture is most effective for real-time facial emotion recognition?",
        "options": ["CNN (Convolutional Neural Network)", "RNN", "GAN", "Transformer"],
        "correct_answer": "CNN (Convolutional Neural Network)",
        "explanation": "CNNs excel at spatial feature extraction, making them ideal for image-based emotion recognition."
    },
    {
        "course_id": "emotion-ai-architecture",
        "module_id": "", "lesson_id": "", "topic": "Emotion AI",
        "difficulty": "hard",
        "question": "What is the Valence-Arousal model used for in affective computing?",
        "options": [
            "Representing emotions on a 2D continuous scale",
            "Classifying text sentiment",
            "Detecting objects in images",
            "Compressing neural network weights"
        ],
        "correct_answer": "Representing emotions on a 2D continuous scale",
        "explanation": "The Valence-Arousal model maps emotions onto two dimensions: pleasantness (valence) and intensity (arousal)."
    },
    {
        "course_id": "neural-networks-101",
        "module_id": "", "lesson_id": "", "topic": "Neural Networks",
        "difficulty": "hard",
        "question": "What problem does batch normalization solve in deep networks?",
        "options": [
            "Internal covariate shift",
            "Overfitting",
            "Data imbalance",
            "Memory leaks"
        ],
        "correct_answer": "Internal covariate shift",
        "explanation": "Batch normalization stabilizes training by normalizing layer inputs, reducing internal covariate shift."
    },
    {
        "course_id": "advanced-react-patterns",
        "module_id": "", "lesson_id": "", "topic": "React",
        "difficulty": "hard",
        "question": "What is the primary advantage of React's concurrent rendering?",
        "options": [
            "Interruptible rendering for better responsiveness",
            "Faster network requests",
            "Smaller bundle size",
            "Server-side caching"
        ],
        "correct_answer": "Interruptible rendering for better responsiveness",
        "explanation": "Concurrent rendering lets React pause, resume, and prioritize rendering work for smoother UIs."
    },
    # Generic fallback questions (no specific course)
    {
        "course_id": "default",
        "module_id": "", "lesson_id": "", "topic": "General",
        "difficulty": "easy",
        "question": "What does HTML stand for?",
        "options": ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyper Transfer Markup Language"],
        "correct_answer": "HyperText Markup Language",
        "explanation": "HTML is the standard markup language for creating web pages."
    },
    {
        "course_id": "default",
        "module_id": "", "lesson_id": "", "topic": "General",
        "difficulty": "medium",
        "question": "What is the time complexity of binary search?",
        "options": ["O(log n)", "O(n)", "O(n²)", "O(1)"],
        "correct_answer": "O(log n)",
        "explanation": "Binary search halves the search space each step, giving logarithmic time complexity."
    },
    {
        "course_id": "default",
        "module_id": "", "lesson_id": "", "topic": "General",
        "difficulty": "hard",
        "question": "What is the CAP theorem in distributed systems?",
        "options": [
            "A system can guarantee at most 2 of: Consistency, Availability, Partition tolerance",
            "All databases must be centralized",
            "Caching always improves performance",
            "Compression and Partitioning are equivalent"
        ],
        "correct_answer": "A system can guarantee at most 2 of: Consistency, Availability, Partition tolerance",
        "explanation": "The CAP theorem states that in the presence of network partitions, a distributed system must choose between consistency and availability."
    },
]


async def _ensure_seeded():
    """Seed questions if the collection is empty."""
    count = await adaptive_quizzes_collection.count_documents({})
    if count == 0:
        print("[adaptive-quiz] Seeding sample questions...")
        for q in SEED_QUESTIONS:
            q["created_at"] = datetime.utcnow()
        await adaptive_quizzes_collection.insert_many(SEED_QUESTIONS)
        print(f"[adaptive-quiz] Seeded {len(SEED_QUESTIONS)} questions.")


# ─── GET questions ───────────────────────────────────────────────────────────

@router.get("/questions")
async def get_questions(
    course_id: str = "default",
    module_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: str = "medium",
    limit: int = 5,
):
    """
    Fetch quiz questions filtered by course/module/lesson/topic and difficulty.
    Falls back to medium difficulty, then to generic 'default' course questions.
    """
    await _ensure_seeded()

    query = {"difficulty": difficulty}

    # Build filter — prefer specific, fall back to broader
    if lesson_id:
        query["lesson_id"] = lesson_id
    if module_id:
        query["module_id"] = module_id
    if course_id:
        query["course_id"] = course_id
    if topic:
        query["topic"] = topic

    cursor = adaptive_quizzes_collection.find(query).limit(limit)
    questions = await cursor.to_list(length=limit)

    # Fallback 1: try same course, any sub-filter
    if not questions and (lesson_id or module_id or topic):
        fallback_q = {"course_id": course_id, "difficulty": difficulty}
        cursor = adaptive_quizzes_collection.find(fallback_q).limit(limit)
        questions = await cursor.to_list(length=limit)

    # Fallback 2: try medium difficulty for the course
    if not questions and difficulty != "medium":
        fallback_q = {"course_id": course_id, "difficulty": "medium"}
        cursor = adaptive_quizzes_collection.find(fallback_q).limit(limit)
        questions = await cursor.to_list(length=limit)

    # Fallback 3: generic default questions
    if not questions:
        fallback_q = {"course_id": "default", "difficulty": difficulty}
        cursor = adaptive_quizzes_collection.find(fallback_q).limit(limit)
        questions = await cursor.to_list(length=limit)

    # Final fallback: any default questions
    if not questions:
        cursor = adaptive_quizzes_collection.find({"course_id": "default"}).limit(limit)
        questions = await cursor.to_list(length=limit)

    return [_serialize(q) for q in questions]


# ─── POST submit answer ──────────────────────────────────────────────────────

@router.post("/submit")
async def submit_answer(attempt: QuizAttemptCreate):
    """Store a quiz attempt and return success with the correct answer."""
    doc = attempt.dict()
    doc["timestamp"] = datetime.utcnow()

    result = await quiz_attempts_collection.insert_one(doc)

    # Look up the correct answer for feedback
    try:
        question = await adaptive_quizzes_collection.find_one(
            {"_id": ObjectId(attempt.question_id)}
        )
    except Exception:
        question = None

    correct_answer = question.get("correct_answer", "") if question else ""
    explanation = question.get("explanation", "") if question else ""

    return {
        "status": "success",
        "attempt_id": str(result.inserted_id),
        "is_correct": attempt.is_correct,
        "correct_answer": correct_answer,
        "explanation": explanation,
    }


# ─── GET user quiz stats ─────────────────────────────────────────────────────

@router.get("/stats")
async def get_quiz_stats(user_id: str):
    """Return aggregate quiz performance for a user."""
    cursor = quiz_attempts_collection.find({"user_id": user_id})
    attempts = await cursor.to_list(length=5000)

    if not attempts:
        return {
            "total_attempts": 0,
            "correct": 0,
            "accuracy": 0,
            "avg_focus": 0,
            "by_difficulty": {},
        }

    total = len(attempts)
    correct = sum(1 for a in attempts if a.get("is_correct"))
    accuracy = round((correct / total) * 100, 1) if total else 0
    avg_focus = round(
        sum(a.get("focus_score", 50) for a in attempts) / total, 1
    ) if total else 0

    # Break down by difficulty
    by_difficulty = {}
    for a in attempts:
        diff = a.get("difficulty", "medium")
        if diff not in by_difficulty:
            by_difficulty[diff] = {"total": 0, "correct": 0}
        by_difficulty[diff]["total"] += 1
        if a.get("is_correct"):
            by_difficulty[diff]["correct"] += 1

    return {
        "total_attempts": total,
        "correct": correct,
        "accuracy": accuracy,
        "avg_focus": avg_focus,
        "by_difficulty": by_difficulty,
    }


# ─── POST seed (manual / admin) ──────────────────────────────────────────────

@router.post("/seed")
async def seed_questions():
    """Force re-seed sample questions (admin utility)."""
    await adaptive_quizzes_collection.delete_many({})
    for q in SEED_QUESTIONS:
        q["created_at"] = datetime.utcnow()
    await adaptive_quizzes_collection.insert_many(SEED_QUESTIONS)
    return {"status": "seeded", "count": len(SEED_QUESTIONS)}
