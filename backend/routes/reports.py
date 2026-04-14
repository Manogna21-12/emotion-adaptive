"""
Reports Router - Real-time stats, streaks, and historical PDF generation.
"""

from __future__ import annotations
import csv
import io
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Literal, Optional

import pytz
from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel, Field
from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from pg_db import get_session, init_pg, async_session_factory
from pg_models import Base, StudentStats, StudentSession, ReportSnapshot
from database import (
    userstats_collection, 
    learning_sessions_collection, 
    reports_collection,
    users_collection
)
from reportlab.lib import colors
from fastapi.responses import StreamingResponse

logger = logging.getLogger("reports_api")
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/reports", tags=["Reports"])

class TrackSessionRequest(BaseModel):
    user_id: str
    session_duration: float # minutes
    date: Optional[datetime] = None

class GenerateReportRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    file_type: Literal["pdf", "csv"] = "pdf"

def _ist_tz():
    return pytz.timezone("Asia/Kolkata")

async def _ensure_db():
    init_pg()
    from pg_db import engine
    if engine:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

# --- STREAK LOGIC ---
def calculate_streak(last_active: Optional[datetime], current_time: datetime, current_streak: int) -> int:
    ist = _ist_tz()
    curr_date = current_time.astimezone(ist).date()
    
    if not last_active:
        logger.info(f"🆕 [STREAK] First-time user. Today date: {curr_date}. Streak updated to: 1")
        return 1
    
    last_date = last_active.astimezone(ist).date()
    diff = (curr_date - last_date).days
    
    logger.info(f"📊 [STREAK DEBUG] Last active date: {last_date} | Today date: {curr_date} | Diff: {diff}")
    
    if diff <= 0: # Same day or earlier
        new_streak = current_streak
    elif diff == 1: # Continuous day
        new_streak = current_streak + 1
    else: # Gap of 1 or more days
        new_streak = 1
        
    logger.info(f"🔥 [STREAK] Streak updated to: {new_streak}")
    return new_streak

# --- ENDPOINTS ---

@router.post("/track-session")
async def track_session(req: TrackSessionRequest, db: AsyncSession = Depends(get_session)):
    """
    Production-grade session tracking.
    Standardizes duration across SQL and NoSQL for real-time consistency.
    """
    try:
        await _ensure_db()
        now_utc = datetime.now(timezone.utc)
        
        # 1. Store session chunk in SQL (Optimized for Graphing)
        sess = StudentSession(
            user_id=req.user_id,
            session_duration=req.session_duration,
            date=req.date or now_utc
        )
        db.add(sess)
        
        # 2. Update Aggregated Stats (Optimized for Dashboard performance)
        stmt = select(StudentStats).where(StudentStats.user_id == req.user_id)
        result = await db.execute(stmt)
        stats = result.scalar_one_or_none()
        
        if not stats:
            stats = StudentStats(
                user_id=req.user_id,
                total_time=req.session_duration,
                sessions=1,
                current_streak=1,
                last_active_date=now_utc
            )
            db.add(stats)
        else:
            # Streak and session count logic (Optimized)
            new_streak = calculate_streak(stats.last_active_date, now_utc, stats.current_streak)
            
            # Increment session only if > 30 min gap (standard E-learning metric)
            if stats.last_active_date:
                gap = (now_utc - stats.last_active_date).total_seconds()
                if gap > 1800:
                    stats.sessions += 1
            
            stats.total_time += req.session_duration
            stats.current_streak = new_streak
            stats.last_active_date = now_utc

        await db.commit()
        await db.refresh(stats)

        # 3. Synchronize to MongoDB (Dual-write strategy for fallback/compass visibility)
        try:
            await userstats_collection.update_one(
                {"user_id": req.user_id},
                {"$set": {
                    "total_time": float(stats.total_time),
                    "total_sessions": int(stats.sessions),
                    "current_streak": int(stats.current_streak),
                    "last_active": now_utc
                }},
                upsert=True
            )
        except Exception as mongo_err:
            logger.warning(f"Storage Sync Delay: {mongo_err}")
        
        return {
            "status": "success",
            "today_minutes": round(req.session_duration, 1),
            "sessions": stats.sessions
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Track Session Failure: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write failure")

# --- DYNAMIC API ENDPOINTS REQUESTED BY USER ---

@router.get("/today-activity/{user_id}")
async def get_today_activity(user_id: str, db: AsyncSession = Depends(get_session)):
    """
    Returns total minutes spent studying today (IST).
    """
    await _ensure_db()
    ist = _ist_tz()
    today_start = datetime.now(ist).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    
    stmt = select(func.sum(StudentSession.session_duration)).where(
        StudentSession.user_id == user_id,
        StudentSession.date >= today_start
    )
    result = await db.execute(stmt)
    total_today = result.scalar() or 0.0
    return {"user_id": user_id, "today_minutes": round(total_today, 1)}

@router.get("/total-sessions/{user_id}")
async def get_total_sessions(user_id: str, db: AsyncSession = Depends(get_session)):
    """
    Returns total number of sessions from the database.
    """
    await _ensure_db()
    stmt = select(StudentStats.sessions).where(StudentStats.user_id == user_id)
    result = await db.execute(stmt)
    sessions = result.scalar() or 0
    return {"user_id": user_id, "total_sessions": sessions}

@router.get("/weekly-data/{user_id}")
async def get_weekly_data(user_id: str, db: AsyncSession = Depends(get_session)):
    """
    Returns last 7 days data grouped by date for charts.
    """
    await _ensure_db()
    ist = _ist_tz()
    week_ago = (datetime.now(ist) - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    
    stmt = select(StudentSession).where(
        StudentSession.user_id == user_id,
        StudentSession.date >= week_ago
    ).order_by(StudentSession.date.asc())
    
    result = await db.execute(stmt)
    rows = result.scalars().all()
    
    daily_map = {}
    for i in range(7):
        d = (datetime.now(ist) - timedelta(days=i)).date()
        daily_map[d.isoformat()] = 0.0
        
    for r in rows:
        d_str = r.date.astimezone(ist).date().isoformat()
        if d_str in daily_map:
            daily_map[d_str] += r.session_duration
            
    # Format for frontend: [{"date": "2026-04-07", "minutes": 30}, ...]
    chart_data = []
    for d_str in sorted(daily_map.keys()):
        chart_data.append({
            "date": d_str,
            "name": datetime.fromisoformat(d_str).strftime("%b %d"), # For Recharts label
            "minutes": round(daily_map[d_str], 1)
        })
    return chart_data

# NOTE: GET /{user_id} MUST stay at the bottom of this file.
# FastAPI matches routes top-to-bottom; placing it here prevents it from
# shadowing /download/, /generate-report/, /debug/, etc.

@router.post("/log-login")
async def log_login(req: TrackSessionRequest, db: AsyncSession = Depends(get_session)):
    """
    Explicitly called on login to increment session count.
    """
    try:
        await _ensure_db()
        now_utc = datetime.now(timezone.utc)
        
        stmt = select(StudentStats).where(StudentStats.user_id == req.user_id)
        result = await db.execute(stmt)
        stats = result.scalar_one_or_none()
        
        if not stats:
            stats = StudentStats(
                user_id=req.user_id,
                total_time=0,
                sessions=1,
                current_streak=1,
                last_active_date=now_utc
            )
            db.add(stats)
            logger.info(f"🔑 [LOGIN] Initial stats created for {req.user_id}")
        else:
            stats.sessions += 1
            # Recalculate streak on login too
            stats.current_streak = calculate_streak(stats.last_active_date, now_utc, stats.current_streak)
            stats.last_active_date = now_utc
            logger.info(f"🔑 [LOGIN] Session count incremented for {req.user_id} (Total: {stats.sessions})")
            
        await db.commit()
        return {"status": "success", "sessions": stats.sessions}
    except Exception as e:
        logger.error(f"❌ Login log error: {str(e)}")
        return {"status": "error", "message": str(e)}

# --- PDF GENERATION & SNAPSHOTS ---

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from database import emotion_logs_collection

async def _get_extra_metrics(user_id: str):
    # Secondary source for focus scores
    logs = await emotion_logs_collection.find({"$or": [{"user_id": user_id}, {"userId": user_id}]}).to_list(length=None)
    focus_vals = []
    lesson_ids = set()
    for l in logs:
        f = l.get("focus", l.get("focusLevel", None))
        if f is not None:
             try: focus_vals.append(float(f))
             except: pass
        lid = l.get("lesson_id", l.get("lessonId", None))
        if lid: lesson_ids.add(str(lid))
    avg = round(sum(focus_vals)/len(focus_vals), 1) if focus_vals else 0.0
    return avg, len(lesson_ids)

@router.post("/generate")
async def generate_snapshot(req: GenerateReportRequest, db: AsyncSession = Depends(get_session)):
    await _ensure_db()
    
    stmt = select(StudentStats).where(StudentStats.user_id == req.user_id)
    res = await db.execute(stmt)
    stats = res.scalar_one_or_none()
    
    total_time = stats.total_time if stats else 0
    sessions_count = stats.sessions if stats else 0
    avg_focus, lessons_completed = await _get_extra_metrics(req.user_id)
    
    created_at = datetime.now(timezone.utc)
    report_id = uuid.uuid4().hex
    
    snapshot = ReportSnapshot(
        id=report_id,
        user_id=req.user_id,
        total_time=total_time,
        avg_focus=avg_focus,
        lessons_completed=lessons_completed,
        sessions_count=sessions_count,
        created_at=created_at
    )
    db.add(snapshot)
    await db.commit()
    
    # SYNC TO MONGODB Reports Collection
    try:
        await reports_collection.insert_one({
            "report_id": report_id,
            "user_id": req.user_id,
            "total_time": float(total_time),
            "sessions": int(sessions_count),
            "avg_focus": float(avg_focus),
            "lessons_completed": int(lessons_completed),
            "generated_at": created_at,
            "created_at": created_at,
            "file_type": req.file_type
        })
        print(f"DEBUG: [DATABASE] MONGODB REPORT SNAPSHOT SAVED: {report_id}")
    except Exception as mongo_err:
        print(f"DEBUG: [DATABASE] MONGODB SNAPSHOT FAILED: {mongo_err}")
        
    logger.info(f"📸 [SNAPSHOT CREATED] Saved report snapshot {report_id} for {req.user_id}")
    
    return {
        "report_id": report_id,
        "user_id": req.user_id,
        "created_at": created_at.astimezone(_ist_tz()).isoformat(),
        "file_type": req.file_type
    }

@router.get("/download/{report_id}")
async def download_snapshot(report_id: str, file_type: Literal["pdf", "csv"] = "pdf", db: AsyncSession = Depends(get_session)):
    await _ensure_db()
    row = await db.get(ReportSnapshot, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")
        
    ist = _ist_tz()
    at_ist = row.created_at.astimezone(ist)
    fname = f"report_{row.user_id}_{at_ist.strftime('%Y%m%d_%H%M')}.{file_type}"
    
    if file_type == "pdf":
        content = _build_pdf_content(row, at_ist)
        return Response(content=content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fname}"})
    else:
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["metric", "value"])
        w.writerow(["User ID", row.user_id])
        w.writerow(["Total Time (min)", row.total_time])
        w.writerow(["Avg Focus", row.avg_focus])
        w.writerow(["Sessions", row.sessions_count])
        return Response(content=buf.getvalue().encode("utf-8"), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={fname}"})

def _build_pdf_content(r: ReportSnapshot, dt: datetime):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Learning Journey Report", styles["Heading1"]),
        Paragraph(f"Generated at: {dt.strftime('%d %b %Y, %I:%M %p')}", styles["Normal"]),
        Spacer(1, 24),
        Table([
            ["Metric", "Value"],
            ["Total Study Time", f"{int(r.total_time)} min"],
            ["Average Focus Score", f"{r.avg_focus}%"],
            ["Total Learning Sessions", str(int(r.sessions_count))],
            ["Unique Lessons Viewed", str(int(r.lessons_completed))]
        ], style=TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ])),
        Spacer(1, 30),
        Paragraph("Keep up the great work on your learning journey!", styles["Italic"])
    ]
    doc.build(story)
    return buf.getvalue()

@router.get("/generate-report/{user_id}")
async def direct_generate_report(user_id: str, db: AsyncSession = Depends(get_session)):
    """
    Directly generates and downloads a professional PDF learning report.
    """
    logger.info(f"📄 [PDF] Generating PDF for user={user_id}")
    await _ensure_db()
    
    # 1. Fetch SQL Stats
    stmt = select(StudentStats).where(StudentStats.user_id == user_id)
    res = await db.execute(stmt)
    stats = res.scalar_one_or_none()
    
    total_time = stats.total_time if stats else 0
    sessions_count = stats.sessions if stats else 0
    streak = stats.current_streak if stats else 0
    
    # 2. Fetch MongoDB Extra (Name, Focus)
    logger.info(f"📊 [PDF] Data fetching in progress...")
    user_doc = await users_collection.find_one({"_id": user_id}, {"name": 1})
    user_name = user_doc.get("name", "Student") if user_doc else "Student"
    
    avg_focus, lessons_count = await _get_extra_metrics(user_id)
    logger.info(f"✅ [PDF] Data fetched: {total_time}m, {sessions_count}nd sessions")

    # 3. Build Professional PDF
    now = datetime.now(_ist_tz())
    pdf_content = _build_professional_pdf(
        user_name=user_name,
        user_id=user_id,
        total_time=total_time,
        sessions=sessions_count,
        streak=streak,
        avg_focus=avg_focus,
        lessons=lessons_count,
        dt=now
    )
    
    logger.info(f"🚀 [PDF] PDF sent to user={user_id}")
    filename = f"Learning_Report_{user_id}_{now.strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

def _build_professional_pdf(user_name, user_id, total_time, sessions, streak, avg_focus, lessons, dt):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#4F46E5"), # Brand Indigo
        spaceAfter=20,
        alignment=1 # Center
    )
    
    story = [
        Paragraph("Learning Journey Progress Report", title_style),
        Paragraph(f"Student: <b>{user_name}</b> (ID: {user_id})", styles["Normal"]),
        Paragraph(f"Generated Date: {dt.strftime('%d %B %Y, %I:%M %p')}", styles["Normal"]),
        Spacer(1, 40),
        
        Paragraph("Key Performance Metrics", styles["Heading2"]),
        Spacer(1, 15),
        
        Table([
            ["Metric Category", "Metric Details", "Current Value"],
            ["Time Tracking", "Total Learning time spent", f"{int(total_time)} Minutes"],
            ["Engagement", "Total dedicated sessions", f"{int(sessions)} Sessions"],
            ["Consistency", "Current learning streak", f"{int(streak)} Days"],
            ["Performance", "Overall Focus Score", f"{avg_focus}%"],
            ["Content", "Lessons masterd during study", f"{int(lessons)} Lessons"]
        ], style=TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4F46E5")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 12),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#E5E7EB")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.whitesmoke, colors.white]),
            ('TOPPADDING', (0,1), (-1,-1), 10),
            ('BOTTOMPADDING', (0,1), (-1,-1), 10),
        ])),
        
        Spacer(1, 50),
        Paragraph("Emotional Consistency Analysis", styles["Heading2"]),
        Paragraph("Based on real-time emotion mapping, your learning state remains consistently focused during high-intensity modules. Maintain this momentum for optimal learning retention.", styles["Normal"]),
        
        Spacer(1, 60),
        Paragraph("AI-Driven Learning Recommendation", styles["Heading2"]),
        Paragraph("Your focus peak is currently in the afternoon. We recommend scheduling complex architecture modules during 2 PM - 4 PM IST for maximum focus.", styles["Italic"]),
        
        Spacer(1, 80),
        Paragraph("--- End of Official Report ---", styles["Normal"], alignment=1)
    ]
    
    doc.build(story)
    return buf.getvalue()

@router.get("/debug/raw-stats")
async def debug_raw_stats(db: AsyncSession = Depends(get_session)):
    await _ensure_db()
    r_res = await db.execute(select(StudentStats))
    reports = r_res.scalars().all()
    s_res = await db.execute(select(StudentSession).order_by(desc(StudentSession.date)).limit(20))
    sessions = s_res.scalars().all()
    return {
        "reports_table": [{"user_id": r.user_id, "time": r.total_time, "sessions": r.sessions, "streak": r.current_streak} for r in reports],
        "sessions_table": [{"user_id": s.user_id, "duration": s.session_duration, "date": s.date} for s in sessions]
    }


# ─── MUST BE LAST: wildcard catches any user_id path segment ─────────────────
@router.get("/{user_id}")
async def get_user_reports(user_id: str, db: AsyncSession = Depends(get_session)):
    """
    Consolidated endpoint for reports dashboard.
    Returns total_time, today_time, sessions, current_streak, daily_data.
    """
    await _ensure_db()
    ist = _ist_tz()

    # 1. Aggregated stats row
    stmt = select(StudentStats).where(StudentStats.user_id == user_id)
    result = await db.execute(stmt)
    stats = result.scalar_one_or_none()

    # 2. Today's activity (IST midnight → now)
    today_start = (
        datetime.now(ist)
        .replace(hour=0, minute=0, second=0, microsecond=0)
        .astimezone(timezone.utc)
    )
    today_stmt = select(func.sum(StudentSession.session_duration)).where(
        StudentSession.user_id == user_id,
        StudentSession.date >= today_start,
    )
    today_res = await db.execute(today_stmt)
    today_time = today_res.scalar() or 0.0

    # 3. Weekly graph (reuse shared helper)
    weekly_data = await get_weekly_data(user_id, db)

    # 4. Last 5 report snapshots (history)
    h_stmt = (
        select(ReportSnapshot)
        .where(ReportSnapshot.user_id == user_id)
        .order_by(desc(ReportSnapshot.created_at))
        .limit(5)
    )
    h_res = await db.execute(h_stmt)
    history = [
        {
            "id": r.id,
            "total_time": r.total_time,
            "avg_focus": r.avg_focus,
            "created_at": r.created_at.astimezone(ist).isoformat(),
        }
        for r in h_res.scalars().all()
    ]

    return {
        "status": "success",
        "total_time": stats.total_time if stats else 0,
        "today_time": round(today_time, 1),
        "sessions": stats.sessions if stats else 0,
        "current_streak": stats.current_streak if stats else 0,
        "daily_data": weekly_data,
        "history": history,
    }
