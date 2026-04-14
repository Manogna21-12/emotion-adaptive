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
    print(f"Dashboard summary requested for: {user_id}")
    match = _user_match_query(user_id)
    
    # Calculate today's date boundary in UTC for comparison with stored naive datetimes
    ist = pytz.timezone("Asia/Kolkata")
    now_ist = datetime.now(ist)
    start_of_day_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    # Get the UTC equivalent of the start of the day in IST
    today_start_utc = start_of_day_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    
    from database import reader_emotion_logs_collection
    
    # TODAY'S METRICS (Focus and Time)
    today_match = {"timestamp": {"$gte": today_start_utc}}
    learning_logs_today = await emotion_logs_collection.find({**match, **today_match}).to_list(length=1000)
    reader_logs_today = await reader_emotion_logs_collection.find({**match, **today_match}).to_list(length=1000)
    all_logs_today = learning_logs_today + reader_logs_today
    
    # ALL-TIME METRICS (Mastery)
    learning_logs_all = await emotion_logs_collection.find(match).to_list(length=5000)
    reader_logs_all = await reader_emotion_logs_collection.find(match).to_list(length=5000)
    all_logs_history = learning_logs_all + reader_logs_all
    
    focus_map = {
        "happy": 95, "neutral": 85, "surprise": 80,
        "sad": 40, "angry": 30, "fear": 35, "disgust": 20, "no_face": 0
    }
    
    # Calculate Today's Focus
    if not all_logs_today:
        focus_score_today = 0
        time_spent_minutes = 0
    else:
        total_focus = 0
        for log in all_logs_today:
            # Prefer explicit focus field if available, else map from emotion
            score = log.get("focus") or log.get("focusLevel")
            if score is None:
                score = focus_map.get(log.get("emotion", "neutral").lower(), 70)
            total_focus += float(score)
        focus_score_today = int(total_focus / len(all_logs_today))
        
        time_spent_seconds = sum(log.get("duration", 0) for log in all_logs_today)
        time_spent_minutes = round(time_spent_seconds / 60, 1)

    # Calculate All-Time Topics Mastered
    concept_stats = {}
    for log in all_logs_history:
        cid = log.get("concept_id") or log.get("lesson_id")
        if not cid: continue
        if cid not in concept_stats: concept_stats[cid] = []
        
        score = log.get("focus") or log.get("focusLevel")
        if score is None:
            score = focus_map.get(log.get("emotion", "neutral").lower(), 70)
        concept_stats[cid].append(float(score))
    
    # A topic is mastered if its average focus score across all sessions is > 70
    topics_mastered = sum(1 for scores in concept_stats.values() if (sum(scores)/len(scores)) > 70)
    
    # Current Streak
    user_stat = await userstats_collection.find_one({"user_id": user_id})
    current_streak = user_stat.get("current_streak", 0) if user_stat else 0
    
    # Cognitive state (Today)
    if focus_score_today > 75: cognitive_state = "Deep Focus"
    elif focus_score_today > 45: cognitive_state = "Normal"
    else: cognitive_state = "Distracted"
        
    return {
        "focus_score_today": focus_score_today,
        "time_spent_minutes": time_spent_minutes,
        "current_streak": current_streak,
        "lessons_completed": len(concept_stats),
        "cognitive_state": cognitive_state,
        "topics_mastered": topics_mastered
    }

@router.get("/dashboard-stats")
async def get_dashboard_stats(user_id: str):
    return await get_dashboard_summary(user_id)


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

