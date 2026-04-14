from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Progress(Base):
    __tablename__ = "progress"

    user_id: Mapped[str] = mapped_column(String(128), primary_key=True)

    learning_consistency: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    peak_focus_time: Mapped[str] = mapped_column(String(64), nullable=False, default="No data")
    focus_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    trend: Mapped[str] = mapped_column(String(32), nullable=False, default="Stable")
    # Optional extra detail (not required by UI, but helpful)
    trend_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class StudentStats(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    
    total_time: Mapped[float] = mapped_column(Float, nullable=False, default=0.0) # minutes
    sessions: Mapped[int] = mapped_column(nullable=False, default=0)
    current_streak: Mapped[int] = mapped_column(nullable=False, default=0)
    last_active_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class StudentSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    
    session_duration: Mapped[float] = mapped_column(Float, nullable=False) # minutes
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=func.now())
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)

    total_time: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # minutes
    avg_focus: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # 0-100
    lessons_completed: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sessions_count: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="info") # info, success, warning, alert
    is_read: Mapped[bool] = mapped_column(nullable=False, default=False)
    action_link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
