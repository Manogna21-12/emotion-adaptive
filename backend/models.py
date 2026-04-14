from pydantic import BaseModel, EmailStr, Field
from typing import Literal, List, Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Literal["student", "admin"] = Field(default="student")


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class EmailSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class SmartReaderCreate(BaseModel):
    title: str
    description: str
    link: str

class EmotionLogCreate(BaseModel):
    user_id: str
    concept_id: str
    emotion: str
    duration: int # in seconds

class ReaderEmotionLog(BaseModel):
    user_id: str
    concept_id: str
    emotion: str
    duration: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class QuizQuestionCreate(BaseModel):
    course_id: str
    module_id: str = ""
    lesson_id: str = ""
    topic: str = ""
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None


class QuizAttemptCreate(BaseModel):
    user_id: str
    question_id: str
    selected_answer: str
    is_correct: bool
    emotion: str = "neutral"
    focus_score: int = 50
    difficulty: str = "medium"
