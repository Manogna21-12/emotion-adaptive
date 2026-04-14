from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import pytz

from database import users_collection, emotion_logs_collection, lessons_collection, notifications_collection, userstats_collection


router = APIRouter(tags=["Student Dashboard"])


def _try_objectid(value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(value)
    except Exception:
        return None

def _format_time(ts: Any) -> str:
    if isinstance(ts, datetime):
        # Convert to IST for display
        ist = pytz.timezone("Asia/Kolkata")
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=pytz.UTC)
        ts_ist = ts.astimezone(ist)
        return ts_ist.strftime("%I:%M %p")
    return ""

def _user_match_query(user_id: str) -> Dict[str, Any]:
    # Support userId stored as string or ObjectId, and both key styles.
    oid = _try_objectid(user_id)
    candidates: List[Dict[str, Any]] = [{"userId": user_id}, {"user_id": user_id}]
    if oid is not None:
        candidates.extend([{"userId": oid}, {"user_id": oid}])
    return {"$or": candidates}


@router.get("/user/{user_id}")
async def get_user_info(user_id: str):
    print("Received user_id (GET /user):", user_id)
    oid = _try_objectid(user_id)
    if oid is not None:
        query = {"$or": [{"_id": oid}, {"_id": user_id}]}
    else:
        query = {"_id": user_id}

    user = await users_collection.find_one(query, {"name": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": str(user.get("_id")), "name": user.get("name", "")}


@router.get("/dashboard/emotion-impact/{user_id}")
async def get_emotion_impact(user_id: str):
    print("Emotion impact API called for user:", user_id)
    match = _user_match_query(user_id)
    
    # Get emotion logs from last 7 days for impact analysis
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    cursor = emotion_logs_collection.find({
        **match,
        "timestamp": {"$gte": seven_days_ago}
    }).sort("timestamp", -1)
    logs = await cursor.to_list(length=100)
    
    # Count emotion frequencies
    emotion_counts = {}
    total_logs = 0
    
    for log in logs:
        emotion = log.get('emotion', 'neutral')
        if emotion != 'no_face':
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            total_logs += 1
    
    print(f"Emotion counts: {emotion_counts}")
    
    # Calculate percentages
    emotion_impact = {}
    for emotion, count in emotion_counts.items():
        percentage = int((count / total_logs) * 100) if total_logs > 0 else 0
        emotion_impact[emotion] = {
            "count": count,
            "percentage": percentage
        }
    
    return emotion_impact


@router.get("/dashboard/summary/{user_id}")
async def get_dashboard_summary(user_id: str):
    print("Dashboard API called")
    print("Received user_id (GET /dashboard/summary):", user_id)
    match = _user_match_query(user_id)
    
    # Calculate today's date boundaries in IST
    ist = pytz.timezone("Asia/Kolkata")
    now_ist = datetime.now(ist)
    # Start of today in IST
    start_of_day_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    # Convert back to UTC for DB queries (since timestamps are stored in UTC)
    today_utc = start_of_day_ist.astimezone(pytz.UTC)
    
    print(f"Today boundaries - UTC: {today_utc}, IST: {start_of_day_ist}")
    
    # Get today's emotion logs for user
    today_match = {
        **match,
        "timestamp": {
            "$gte": today_utc,
            "$lt": today_utc + timedelta(days=1)
        }
    }
    
    cursor = emotion_logs_collection.find(today_match).sort("timestamp", 1)
    today_logs = await cursor.to_list(length=None)
    
    print(f"Logs found: {len(today_logs)}")
    
    if not today_logs:
        return {
            "focus_score_today": 0,
            "time_spent_minutes": 0,
            "current_streak": 0,
            "lessons_completed": 0,
            "cognitive_state": "Neutral"
        }
    
    # Calculate focus score today
    focus_scores = [float(log.get('focus', log.get('focusLevel', 0))) for log in today_logs if log.get('focus') is not None or log.get('focusLevel') is not None]
    focus_score_today = int(sum(focus_scores) / len(focus_scores)) if focus_scores else 0
    
    # Calculate time spent dynamically from true learning sessions today
    time_spent_minutes = 0
    from database import learning_sessions_collection
    session_cursor = learning_sessions_collection.find({
        **match,
        "start_time": {
            "$gte": today_utc,
            "$lt": today_utc + timedelta(days=1)
        }
    })
    sessions_today = await session_cursor.to_list(length=None)
    
    for session in sessions_today:
        time_spent_minutes += session.get("duration_minutes", 0)
        
    print(f"Total time calculated from learning sessions: {time_spent_minutes} minutes")
        
    # Calculate streak from userstats collection
    user_stat = await userstats_collection.find_one({"user_id": user_id})
    current_streak = 0
    if user_stat and "current_streak" in user_stat:
        current_streak = user_stat["current_streak"]
        print(f"Streak from DB: {current_streak}")
    
    # Lessons completed (unique lessons with activity)
    lessons_completed = len({str(log.get('lesson_id', log.get('lessonId'))) for log in today_logs if log.get('lesson_id') or log.get('lessonId')})
    
    # Cognitive state
    if focus_score_today > 70:
        cognitive_state = "Deep Focus"
    elif focus_score_today >= 40:
        cognitive_state = "Normal"
    else:
        cognitive_state = "Low Attention"
        
    result = {
        "focus_score_today": focus_score_today,
        "time_spent_minutes": time_spent_minutes,
        "current_streak": current_streak,
        "lessons_completed": lessons_completed,
        "cognitive_state": cognitive_state
    }
    
    print(f"Dashboard summary result: {result}")
    return result


@router.get("/dashboard/emotions/{user_id}")
async def get_dashboard_emotions(user_id: str):
    print("Received user_id (GET /dashboard/emotions):", user_id)
    match = _user_match_query(user_id)
    
    # Return last 20 emotion logs sorted by timestamp
    cursor = emotion_logs_collection.find(match).sort("timestamp", -1).limit(20)
    docs = await cursor.to_list(length=20)
    
    # Sort them ascending for timeline graph
    docs.reverse()
    
    logs = []
    for d in docs:
        logs.append({
            "emotion": d.get("emotion", "neutral"),
            "focus": float(d.get("focus", d.get("focusLevel", 0))),
            "timestamp": d.get("timestamp"),
            "time": _format_time(d.get("timestamp"))
        })
    
    print(f"Timeline data prepared: {len(logs)} entries")
    return logs


@router.get("/dashboard/timeline/{user_id}")
async def get_dashboard_timeline(user_id: str):
    print("Received user_id (GET /dashboard/timeline):", user_id)
    match = _user_match_query(user_id)
    
    # Get last 20 emotion logs for timeline
    cursor = emotion_logs_collection.find(match).sort("timestamp", -1).limit(20)
    docs = await cursor.to_list(length=20)
    
    # Sort them ascending for timeline graph
    docs.reverse()
    
    timeline_data = []
    for d in docs:
        timeline_data.append({
            "time": _format_time(d.get("timestamp")),
            "focus": float(d.get("focus", d.get("focusLevel", 0))),
            "emotion": d.get("emotion", "neutral")
        })
    
    print(f"Timeline data: {len(timeline_data)} entries")
    return {"timeline": timeline_data}


@router.get("/live-emotion/{user_id}")
async def get_live_emotion(user_id: str):
    print("Received user_id (GET /live-emotion):", user_id)
    match = _user_match_query(user_id)
    
    latest = await emotion_logs_collection.find(match).sort("timestamp", -1).limit(1).to_list(length=1)
    
    if not latest:
        return {
            "emotion": "neutral",
            "focus": 0,
            "timestamp": None,
            "time": ""
        }
        
    d = latest[0]
    return {
        "emotion": d.get("emotion", "neutral"),
        "focus": float(d.get("focus", d.get("focusLevel", 0))),
        "timestamp": d.get("timestamp"),
        "time": _format_time(d.get("timestamp"))
    }


@router.get("/notifications/{user_id}")
async def get_notifications(user_id: str):
    print("Received user_id (GET /notifications):", user_id)
    
    # Also generate smart suggestions based on DB data and store them as notifications if not recent
    match = _user_match_query(user_id)
    cursor = emotion_logs_collection.find(match).sort("timestamp", -1).limit(5)
    recent_logs = await cursor.to_list(length=5)
    
    alerts = []
    
    if recent_logs:
        latest_focus = float(recent_logs[0].get("focus", 0))
        latest_emotion = recent_logs[0].get("emotion", "neutral")
        
        if latest_focus > 70:
            alerts.append({"message": "Great focus! Continue learning", "type": "success"})
        elif latest_focus >= 40:
            alerts.append({"message": "Stay consistent", "type": "info"})
        else:
            alerts.append({"message": "Take a short break or switch topic", "type": "warning"})
            
        no_face_count = sum(1 for log in recent_logs if log.get("emotion") == "no_face")
        if no_face_count >= 2:
            alerts.append({"message": "Stay in front of screen", "type": "warning"})
            
        # Check if focus is continuously dropping in the last 3 logs
        if len(recent_logs) >= 3:
            f1 = float(recent_logs[0].get("focus", 0)) # newest
            f2 = float(recent_logs[1].get("focus", 0))
            f3 = float(recent_logs[2].get("focus", 0))
            if f1 < f2 and f2 < f3 and f1 < 40:
                alerts.append({"message": "You seem distracted", "type": "error"})
    else:
        alerts.append({"message": "Start a lesson to see suggestions", "type": "info"})
        
    # Check actual stored notifications
    n_cursor = notifications_collection.find({"user_id": user_id}).sort("created_at", -1).limit(10)
    db_notifications = await n_cursor.to_list(length=10)
    
    for n in db_notifications:
        alerts.append({
            "message": n.get("message"),
            "type": n.get("type", "info"),
            "id": str(n.get("_id"))
        })
        
    return alerts

