from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import cv2
import numpy as np
import base64
# Lazy import (do NOT import DeepFace at startup).
# This keeps /login and other routes working even if ML deps are missing.
DeepFace = None
from bson import ObjectId

from database import courses_collection, modules_collection, lessons_collection, videos_collection, emotion_logs_collection, userstats_collection, learning_sessions_collection
from datetime import timedelta

router = APIRouter(
    prefix="/learning",
    tags=["Learning Module"]
)

catalog_router = APIRouter(tags=["Learning Catalog"])

def _as_str_id(val):
    # Helper to normalize ObjectId/string IDs in API responses.
    return str(val) if isinstance(val, ObjectId) else val

class EmotionAnalyzeRequest(BaseModel):
    image: str

class EmotionLogRequest(BaseModel):
    user_id: str
    lesson_id: str
    emotion: str
    focus: int

class SessionStartRequest(BaseModel):
    user_id: str
    course_id: str
    lesson_id: str = ""

class SessionEndRequest(BaseModel):
    session_id: str
    duration_minutes: int

@router.get("/courses")
async def get_courses():
    docs = await courses_collection.find(
        {},
        {"_id": 1, "title": 1, "level": 1, "duration": 1},
    ).to_list(length=None)

    courses = []
    for d in docs:
        courses.append(
            {
                "id": str(d["_id"]),
                "title": d.get("title", ""),
                # Optional fields (may be missing in your current schema)
                "level": d.get("level"),
                "duration": d.get("duration"),
            }
        )
    return {"courses": courses}

@router.get("/modules/{course_id}")
async def get_modules(course_id: str):
    try:
        course_oid = ObjectId(course_id)
        course_query = {"$or": [{"courseId": course_id}, {"courseId": course_oid}]}
    except Exception:
        course_query = {"courseId": course_id}

    docs = await modules_collection.find(
        course_query,
        {"_id": 1, "courseId": 1, "title": 1},
    ).to_list(length=None)

    modules = []
    for d in docs:
        module_oid = d["_id"]
        module_id_str = str(module_oid)
        lesson_count = await lessons_collection.count_documents(
            {"$or": [{"moduleId": module_id_str}, {"moduleId": module_oid}]}
        )

        modules.append(
            {
                "id": str(d["_id"]),
                "courseId": _as_str_id(d.get("courseId", course_id)),
                "title": d.get("title", ""),
                "lessonCount": lesson_count,
            }
        )
    return {"modules": modules}


@router.get("/lessons/{module_id}")
async def get_lessons(module_id: str):
    try:
        module_oid = ObjectId(module_id)
        lesson_query = {"$or": [{"moduleId": module_id}, {"moduleId": module_oid}]}
    except Exception:
        lesson_query = {"moduleId": module_id}

    docs = await lessons_collection.find(
        lesson_query,
        {
            "_id": 1,
            "moduleId": 1,
            "title": 1,
            "videoUrl": 1,
            "duration": 1,
            "description": 1,
            "status": 1,
            "order": 1,
        },
    ).sort("order", 1).to_list(length=None)

    lessons = []
    for d in docs:
        lessons.append(
            {
                "id": str(d["_id"]),
                "moduleId": _as_str_id(d.get("moduleId", module_id)),
                "title": d.get("title", ""),
                "videoUrl": d.get("videoUrl"),
                "duration": d.get("duration"),
                # Optional fields used by some UI components
                "description": d.get("description"),
                "status": d.get("status"),
            }
        )

    return {"lessons": lessons}


# Public aliases without the `/learning` prefix
@catalog_router.get("/courses")
async def get_courses_public():
    return await get_courses()


@catalog_router.get("/modules/{course_id}")
async def get_modules_public(course_id: str):
    return await get_modules(course_id)


@catalog_router.get("/lessons/{module_id}")
async def get_lessons_public(module_id: str):
    return await get_lessons(module_id)

@router.get("/videos/{lesson_id}")
async def get_video(lesson_id: str):
    # Prefer using the lessons collection because your current schema stores
    # the Cloudinary URL directly on lessons (`videoUrl`).
    query = {"_id": ObjectId(lesson_id)}
    try:
        lesson = await lessons_collection.find_one(query)
    except Exception:
        lesson = None

    if not lesson:
        # Backward compatibility: some older schemas may store a separate videos collection.
        video = await videos_collection.find_one({"lesson_id": lesson_id}, {"_id": 0})
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        return video

    return {
        "lesson_id": str(lesson["_id"]),
        "title": lesson.get("title", ""),
        "video_url": lesson.get("videoUrl"),
        "videoUrl": lesson.get("videoUrl"),  # compatibility
        "duration": lesson.get("duration"),
    }

@router.post("/analyze-emotion")
async def analyze_emotion(req: EmotionAnalyzeRequest):
    """
    Analyzes emotion from a base64 image string.
    Optimized with detailed logging for debugging.
    """
    try:
        global DeepFace
        # 1. Lazy-load DeepFace model
        if DeepFace is None:
            try:
                print("[DEBUG] Loading DeepFace model...")
                from deepface import DeepFace as _DeepFace
                DeepFace = _DeepFace
                print("[DEBUG] DeepFace loaded successfully.")
            except Exception as e:
                print(f"[ERROR] Failed to import DeepFace: {e}")
                raise HTTPException(
                    status_code=503,
                    detail=f"ML Dependency error: {str(e)}",
                )

        # 2. Process incoming image data
        img_data = req.image
        if not img_data:
            print("[ERROR] Received empty image data.")
            return {"emotion": "error", "focus": 0, "message": "Empty image data"}

        print(f"[DEBUG] Incoming image data length: {len(img_data)}")
        
        if "base64," in img_data:
            img_data = img_data.split("base64,")[1]
            
        try:
            encoded_data = base64.b64decode(img_data)
            nparr = np.frombuffer(encoded_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"[ERROR] Image decoding failed: {e}")
            return {"emotion": "error", "focus": 0, "message": f"Decode failed: {str(e)}"}
        
        if img is None:
            print("[ERROR] OpenCV failed to decode image (result is None).")
            return {"emotion": "error", "focus": 0, "message": "Invalid image format"}

        print(f"[DEBUG] Image decoded successfully. Resolution: {img.shape}")

        # 3. Face Detection (Pre-check using Haar Cascades)
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            print(f"[DEBUG] Face detection count: {len(faces)}")
        except Exception as e:
            print(f"[WARNING] OpenCV face detection failed: {e}. Proceeding to DeepFace anyway.")
            faces = []

        if len(faces) == 0:
            print("[INFO] No face detected in the frame.")
            return {"emotion": "no_face", "focus": 0, "box": None}
            
        x, y, w, h = faces[0]
        box = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
            
        # 4. DeepFace Analysis
        try:
            print("[DEBUG] Starting DeepFace.analyze...")
            results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
            result = results[0] if isinstance(results, list) else results
            dominant_emotion = result.get('dominant_emotion')
            print(f"[DEBUG] Raw analysis result: {dominant_emotion}")
        except Exception as e:
            print(f"[ERROR] DeepFace analyze failed: {e}")
            return {"emotion": "error", "focus": 0, "message": f"DeepFace error: {str(e)}"}
        
        # 5. Focus Calculation Mapping
        # happy/neutral/surprise -> High Focus (90-95)
        # sad/fear/disgust -> Medium/Low (40-60)
        # angry -> Stress/Distraction (30)
        focus_map = {
            "neutral": 95,
            "happy": 90,
            "surprise": 85,
            "fear": 60,
            "sad": 50,
            "disgust": 40,
            "angry": 30
        }
        
        focus_score = focus_map.get(dominant_emotion.lower(), 70)
        
        print(f"[SUCCESS] Analyzed: {dominant_emotion}, Focus: {focus_score}")
        
        return {
            "emotion": dominant_emotion,
            "focus": focus_score,
            "box": box
        }
    except Exception as e:
        print(f"[CRITICAL] Unhandled error in analyze_emotion: {e}")
        import traceback
        traceback.print_exc()
        return {"emotion": "error", "focus": 0, "message": str(e)}

@router.post("/emotion-log")
async def log_emotion(req: EmotionLogRequest):
    """
    Logs an emotion record to MongoDB and updates the user's streak.
    """
    try:
        current_time = datetime.utcnow()
        log_doc = {
            "user_id": req.user_id,
            "lesson_id": req.lesson_id,
            "emotion": req.emotion,
            "focus": float(req.focus),
            "timestamp": current_time
        }
        
        print(f"[DEBUG] Logging to MongoDB: user={req.user_id}, emotion={req.emotion}, focus={req.focus}")
        
        if req.emotion == "error":
            print(f"[WARNING] Logging an 'error' emotion. Source data might be corrupted.")
        
        result = await emotion_logs_collection.insert_one(log_doc)
        print(f"[SUCCESS] Emotion stored. ID: {result.inserted_id}")
        
        # Fixed Streak Update Logic - Check if this is first activity today
        today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        
        user_stat = await userstats_collection.find_one({"user_id": req.user_id})
        current_streak = user_stat.get("current_streak", 0) if user_stat else 0
        last_active_date = user_stat.get("last_active_date") if user_stat else None
        
        new_streak = current_streak
        should_update_streak = False
        
        # Check if this is first activity today
        if not last_active_date:
            # First time user
            new_streak = 1
            should_update_streak = True
            print("First time user - starting streak at 1")
        else:
            last_active_dt = last_active_date if isinstance(last_active_date, datetime) else datetime.fromisoformat(str(last_active_date))
            
            if last_active_dt < yesterday_start:
                # Last activity was before yesterday - reset streak
                new_streak = 1
                should_update_streak = True
                print("Gap > 24 hours - resetting streak to 1")
            elif yesterday_start <= last_active_dt < today_start:
                # Last activity was yesterday - increment streak
                new_streak = current_streak + 1
                should_update_streak = True
                print(f"Activity yesterday - incrementing streak from {current_streak} to {new_streak}")
            else:
                # Already had activity today - don't update streak
                print("Already had activity today - streak unchanged")
        
        # Update streak if needed
        if should_update_streak:
            await userstats_collection.update_one(
                {"user_id": req.user_id},
                {"$set": {
                    "current_streak": new_streak, 
                    "last_active_date": current_time,
                    "last_active": current_time
                }},
                upsert=True
            )
            print(f"Updated streak to {new_streak}")
            
            # Send notification for streak milestone
            try:
                from routes.notifications import create_notification
                await create_notification(
                    user_id=req.user_id,
                    title="Streak Update! 🔥",
                    message=f"Awesome! You've reached a {new_streak}-day learning streak. Don't break the chain!",
                    type="success"
                )
            except Exception as e:
                print(f"Failed to send streak notif: {e}")
        
        # Check for emotional triggers
        if req.emotion in ["sad", "fear", "angry"]:
            try:
                from routes.notifications import create_notification
                await create_notification(
                    user_id=req.user_id,
                    title="Need help? 🧠",
                    message="You seem to be struggling with this part. Maybe take a quick break or review the easier summary?",
                    type="warning",
                    action_link="/courses" # Suggest reviewing courses
                )
            except Exception as e:
                print(f"Failed to send emotion notif: {e}")
        elif req.emotion == "no_face":
            # Cooldown logic for no-face? Maybe just once
            pass
        
        return {"message": "Emotion logged successfully", "id": str(result.inserted_id), "streak": new_streak}
    except Exception as e:
        print(f"[ERROR] Failed to insert emotion log into MongoDB: {e}")
        return {"message": "Error logging emotion", "error": str(e)}

@router.post("/start-session")
async def start_session(req: SessionStartRequest):
    try:
        session_doc = {
            "user_id": req.user_id,
            "course_id": req.course_id,
            "lesson_id": req.lesson_id,
            "start_time": datetime.utcnow(),
            "end_time": None,
            "duration_minutes": 0,
            "status": "active"
        }
        result = await learning_sessions_collection.insert_one(session_doc)
        return {"session_id": str(result.inserted_id), "status": "started"}
    except Exception as e:
        return {"message": "Error starting session", "error": str(e)}

@router.post("/end-session")
async def end_session(req: SessionEndRequest):
    try:
        from bson import ObjectId
        await learning_sessions_collection.update_one(
            {"_id": ObjectId(req.session_id)},
            {"$set": {
                "end_time": datetime.utcnow(),
                "duration_minutes": req.duration_minutes,
                "status": "completed"
            }}
        )
        # Notify on session completion
        try:
            from routes.notifications import create_notification
            # We need to get the user_id from the session_doc first for notifications
            session_doc = await learning_sessions_collection.find_one({"_id": ObjectId(req.session_id)})
            if session_doc:
                user_id = session_doc.get("user_id")
                await create_notification(
                    user_id=user_id,
                    title="Session Milestone! ⏱️",
                    message=f"Great job! You just completed a learning session for {req.duration_minutes} minutes.",
                    type="success",
                    action_link="/reports"
                )
        except Exception as e:
            print(f"Failed to send session notif: {e}")

        return {"message": "Session ended mapping saved", "duration": req.duration_minutes}
    except Exception as e:
        return {"message": "Error ending session", "error": str(e)}

@router.get("/recommend-next/{lesson_id}")
async def recommend_next(lesson_id: str, user_id: str):
    # Fetch user's recent emotions for this lesson
    cursor = emotion_logs_collection.find({"user_id": user_id, "lesson_id": lesson_id}).sort("timestamp", -1).limit(2)
    recent_logs = await cursor.to_list(length=2)
    print(f"[DEBUG] Recommender pulled {len(recent_logs)} recent logs for user {user_id}")
    
    if len(recent_logs) == 2 and all(log['emotion'] in ['sad', 'fear', 'angry', 'error'] for log in recent_logs):
        return {"suggestion": "You seem confused or disengaged. Would you like an easier summary video?", "action": "easier_video"}
        
    return {"suggestion": "You're focused! Proceed to the next lesson.", "action": "next_lesson"}

@router.get("/adaptive-content/{user_id}")
async def get_adaptive_content(user_id: str):
    print(f"Fetching adaptive content for user: {user_id}")
    latest_log = await emotion_logs_collection.find_one({"user_id": user_id}, sort=[("timestamp", -1)])
    if not latest_log:
        return {"suggestion": "Just starting out? Let's stay focused!", "action": "neutral"}
    
    emotion = latest_log.get("emotion")
    
    if emotion in ["happy", "surprise", "focused"]:
        return {"suggestion": "You're doing great! Keep up the good momentum.", "action": "continue"}
    elif emotion == "neutral":
        return {"suggestion": "Pay attention to this next critical part. Here's a brief highlight.", "action": "slight_engagement"}
    elif emotion in ["sad", "fear", "angry", "disgust"]:
        return {"suggestion": "This seems challenging. Would you like to review an easier interactive module?", "action": "easier_content"}
    elif emotion == "no_face":
        return {"suggestion": "Stay focused! We can't see you.", "action": "alert_focus"}
    else:
        return {"suggestion": "Keep learning!", "action": "continue"}

@router.get("/progress/{user_id}")
async def get_user_progress(user_id: str):
    # Fetch all emotion logs for user
    cursor = emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", 1)
    logs = await cursor.to_list(length=None)
    
    # Defaults in case of no logs
    if not logs:
        return {
            "gamification": {"points": 0, "streak": 0},
            "performanceData": [],
            "emotionImpactData": [],
            "emotionTimeline": []
        }
        
    # Gamification
    points = len(logs) * 10
    streak = 1 # Mock simple streak
    
    # Performance Data (group by day)
    from collections import defaultdict
    day_map = defaultdict(lambda: {"focus_sum": 0, "count": 0, "completed": 0})
    for log in logs:
        day_str = log["timestamp"].strftime("%a") # e.g., Mon, Tue
        day_map[day_str]["focus_sum"] += log["focus"]
        day_map[day_str]["count"] += 1
        day_map[day_str]["completed"] += 1 # Mock completion per log for visual density
        
    performanceData = []
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
        if day in day_map:
            avg_foc = day_map[day]["focus_sum"] / day_map[day]["count"]
            performanceData.append({"day": day, "focus": round(avg_foc), "completed": day_map[day]["completed"]})
        else:
            performanceData.append({"day": day, "focus": 0, "completed": 0})
            
    # Emotion Impact Data
    emo_impact = defaultdict(lambda: {"perf_sum": 0, "freq": 0})
    for log in logs:
        emo = log["emotion"].capitalize()
        emo_impact[emo]["perf_sum"] += log["focus"]
        emo_impact[emo]["freq"] += 1
        
    emotionImpactData = []
    for emo, data in emo_impact.items():
        avg_perf = data["perf_sum"] / data["freq"]
        emotionImpactData.append({"emotion": emo, "performance": round(avg_perf), "frequency": data["freq"]})
        
    # Emotion Timeline Data
    emotionTimeline = []
    for log in logs[-24:]: # Last 24 logs
        ist = pytz.timezone("Asia/Kolkata")
        ts = log["timestamp"]
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=pytz.UTC)
            ts = ts.astimezone(ist)
        time_str = ts.strftime("%I:%M %p") if isinstance(ts, datetime) else ""
        emotionTimeline.append({"time": time_str, "score": log["focus"], "emotion": log["emotion"].capitalize()})
        
    return {
        "gamification": {"points": points, "streak": 14}, # Stub 14 day streak for UI completeness
        "performanceData": performanceData,
        "emotionImpactData": emotionImpactData,
        "emotionTimeline": emotionTimeline
    }

@router.get("/timeline/{user_id}")
async def get_timeline(user_id: str):
    try:
        # Get last 20 emotion logs for timeline
        cursor = emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(20)
        logs = await cursor.to_list(length=20)
        
        # Reverse to get chronological order
        logs.reverse()
        
        timeline_data = []
        for log in logs:
            timeline_data.append({
                "time": (
                    log["timestamp"].astimezone(pytz.timezone("Asia/Kolkata")).strftime("%I:%M %p")
                    if isinstance(log.get("timestamp"), datetime)
                    else ""
                ),
                "focus": log.get("focus", 0),
                "emotion": log.get("emotion", "neutral")
            })
        
        return {"timeline": timeline_data}
    except Exception as e:
        print(f"ERROR Fetching Timeline: {e}")
        return {"error": str(e), "timeline": []}

@router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    try:
        from datetime import datetime, timedelta
        
        # Get today's start time
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get today's emotion logs
        cursor = emotion_logs_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": today_start}
        }).sort("timestamp", 1)
        today_logs = await cursor.to_list(length=None)
        
        # Calculate time spent from emotion logs
        time_spent_minutes = 0
        if len(today_logs) >= 2:
            first_time = today_logs[0]["timestamp"]
            last_time = today_logs[-1]["timestamp"]
            time_spent_minutes = int((last_time - first_time).total_seconds() / 60)
        elif len(today_logs) == 1:
            time_spent_minutes = 1  # At least 1 minute if there's activity
        
        # Get latest emotion
        latest_logs = await emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(1).to_list(length=1)
        
        if latest_logs:
            current_emotion = latest_logs[0].get("emotion", "neutral")
            focus_score = latest_logs[0].get("focus", 100)
        else:
            current_emotion = "neutral"
            focus_score = 100

        # Fix streak logic - get from userstats
        user_stat = await userstats_collection.find_one({"user_id": user_id})
        current_streak = user_stat.get("current_streak", 0) if user_stat else 0
        
        # Get last 6 emotion logs for graph data
        graph_logs = await emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", 1).limit(6).to_list(length=6)
        
        graph_data = []
        for log in graph_logs:
            # Convert timestamp to HH:MM format
            if "timestamp" in log:
                t = (
                    log["timestamp"].astimezone(pytz.timezone("Asia/Kolkata")).strftime("%I:%M %p")
                    if isinstance(log.get("timestamp"), datetime)
                    else ""
                )
            else:
                t = "00:00"
            graph_data.append({"time": t, "focus": log.get("focus", 0)})
            
        return {
            "current_emotion": current_emotion,
            "focus_score": focus_score,
            "time_spent": time_spent_minutes,
            "streak": current_streak,
            "topics_mastered": len(await emotion_logs_collection.distinct("lesson_id", {"user_id": user_id})),
            "graph_data": graph_data
        }
    except Exception as e:
        print(f"ERROR Fetching Dashboard: {e}")
        return {"error": str(e)}

# NEW PROGRESS APIs
import pytz

@router.get("/progress/emotion-distribution/{user_id}")
async def get_emotion_distribution(user_id: str):
    print(f"Fetching emotion distribution for user: {user_id}")
    try:
        # Fetch all emotion logs for user
        cursor = emotion_logs_collection.find({"user_id": user_id})
        logs = await cursor.to_list(length=None)
        
        print(f"Fetched logs: {len(logs)}")
        
        # Count occurrences of each emotion
        emotion_counts = {}
        for log in logs:
            emotion = log.get("emotion", "neutral")
            if emotion != "no_face":
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        print(f"Emotion counts: {emotion_counts}")
        
        return emotion_counts
    
    except Exception as e:
        print(f"ERROR fetching emotion distribution: {e}")
        return {"error": str(e)}

@router.get("/progress/weekly/{user_id}")
async def get_weekly_activity(user_id: str):
    print(f"Fetching weekly activity for user: {user_id}")
    try:
        # Get last 7 days of data
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        ist = pytz.timezone("Asia/Kolkata")
        
        cursor = emotion_logs_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        }).sort("timestamp", 1)
        
        logs = await cursor.to_list(length=None)
        print(f"Fetched weekly logs: {len(logs)}")
        
        # Group by day of week
        daily_data = {}
        for log in logs:
            # Convert to IST
            ist_time = log["timestamp"].astimezone(ist)
            day_name = ist_time.strftime("%a")  # Mon, Tue, etc.
            
            if day_name not in daily_data:
                daily_data[day_name] = {"focus": [], "lessons": set()}
            
            daily_data[day_name]["focus"].append(log.get("focus", 0))
            daily_data[day_name]["lessons"].add(log.get("lesson_id", ""))
        
        # Create response array
        week_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        result = []
        
        for day in week_days:
            if day in daily_data:
                focus_scores = daily_data[day]["focus"]
                avg_focus = sum(focus_scores) / len(focus_scores) if focus_scores else 0
                lesson_count = len(daily_data[day]["lessons"])
            else:
                avg_focus = 0
                lesson_count = 0
            
            result.append({
                "day": day,
                "focus": round(avg_focus, 1),
                "lessons": lesson_count
            })
        
        print(f"Weekly activity: {result}")
        return result
    
    except Exception as e:
        print(f"ERROR fetching weekly activity: {e}")
        return {"error": str(e)}

@router.get("/progress/consistency/{user_id}")
async def get_consistency_score(user_id: str):
    print(f"Fetching consistency score for user: {user_id}")
    try:
        # Get last 7 days of data
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        cursor = emotion_logs_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        })
        
        logs = await cursor.to_list(length=None)
        print(f"Fetched consistency logs: {len(logs)}")
        
        # Count unique days user was active
        active_days = set()
        for log in logs:
            day_key = log["timestamp"].strftime("%Y-%m-%d")
            active_days.add(day_key)
        
        # Calculate consistency score
        active_days_count = len(active_days)
        consistency_score = round((active_days_count / 7) * 100)
        
        print(f"Active days: {active_days_count}, Consistency: {consistency_score}%")
        
        return {"consistency_score": consistency_score}
    
    except Exception as e:
        print(f"ERROR fetching consistency: {e}")
        return {"error": str(e), "consistency_score": 0}

@router.get("/progress/peak-focus/{user_id}")
async def get_peak_focus_time(user_id: str):
    print(f"Fetching peak focus time for user: {user_id}")
    try:
        # Get last 7 days of data
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        ist = pytz.timezone("Asia/Kolkata")
        
        cursor = emotion_logs_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        })
        
        logs = await cursor.to_list(length=None)
        print(f"Fetched peak focus logs: {len(logs)}")
        
        if not logs:
            return {"peak_hour": "No data", "peak_focus": 0}
        
        # Group by hour in IST
        hourly_focus = {}
        for log in logs:
            ist_time = log["timestamp"].astimezone(ist)
            hour = ist_time.hour
            focus = log.get("focus", 0)
            
            if hour not in hourly_focus:
                hourly_focus[hour] = []
            hourly_focus[hour].append(focus)
        
        # Find hour with highest average focus
        best_hour = 0
        best_avg_focus = 0
        
        for hour, focus_scores in hourly_focus.items():
            avg_focus = sum(focus_scores) / len(focus_scores)
            if avg_focus > best_avg_focus:
                best_avg_focus = avg_focus
                best_hour = hour
        
        # Convert to 12-hour format
        peak_time = f"{best_hour % 12 or 12} {'AM' if best_hour < 12 else 'PM'}"
        
        print(f"Peak focus time: {peak_time} (avg: {best_avg_focus:.1f})")
        
        return {"peak_time": peak_time, "avg_focus": round(best_avg_focus, 1)}
    
    except Exception as e:
        print(f"ERROR fetching peak focus: {e}")
        return {"error": str(e), "peak_hour": "Error", "peak_focus": 0}

@router.get("/progress/emotion-trend/{user_id}")
async def get_emotion_trend(user_id: str):
    print(f"Fetching emotion trend for user: {user_id}")
    try:
        # Get last 3 sessions
        cursor = emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(30)
        logs = await cursor.to_list(length=None)
        
        print(f"Fetched trend logs: {len(logs)}")
        
        if len(logs) < 10:
            return {"trend": "Insufficient data", "insight": "Complete more learning sessions to see trends"}
        
        # Split into 3 sessions (roughly 10 logs each)
        session_size = len(logs) // 3
        session1 = logs[-session_size:] if session_size > 0 else []
        session2 = logs[-(session_size*2):-session_size] if session_size > 0 else []
        session3 = logs[-(session_size*3):-(session_size*2)] if session_size > 0 else []
        
        # Calculate average focus for each session
        def avg_focus(session):
            if not session: return 0
            return sum(log.get("focus", 0) for log in session) / len(session)
        
        avg1 = avg_focus(session1)
        avg2 = avg_focus(session2) 
        avg3 = avg_focus(session3)
        
        # Determine trend
        if avg3 > avg2 > avg1:
            trend = "improving"
            insight = "Your focus is consistently improving over time! 📈"
        elif avg3 < avg2 < avg1:
            trend = "declining"
            insight = "Your focus has been declining. Try taking breaks! 📉"
        else:
            trend = "stable"
            insight = "Your focus remains stable. Keep up the good work! 📊"
        
        print(f"Emotion trend: {trend} ({avg1:.1f} → {avg2:.1f} → {avg3:.1f})")
        
        return {
            "trend": trend,
            "insight": insight,
            "session_averages": [round(avg1, 1), round(avg2, 1), round(avg3, 1)]
        }
    
    except Exception as e:
        print(f"ERROR fetching emotion trend: {e}")
        return {"error": str(e), "trend": "Error", "insight": "Could not analyze trend"}

@router.get("/live-emotion/{user_id}")
async def get_live_emotion(user_id: str):
    print(f"Fetching live emotion for user: {user_id}")
    try:
        # Get latest emotion log for the user
        latest_log = await emotion_logs_collection.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        
        if not latest_log:
            return {"emotion": "neutral", "focus": 0}
        
        return {
            "emotion": latest_log.get("emotion", "neutral"),
            "focus": latest_log.get("focus", 0)
        }
    
    except Exception as e:
        print(f"ERROR fetching live emotion: {e}")
        return {"emotion": "neutral", "focus": 0}

@router.get("/reports/summary/{user_id}")
async def get_reports_summary(user_id: str):
    print(f"Fetching reports summary for user: {user_id}")
    try:
        # Get all emotion logs for user
        cursor = emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", -1)
        logs = await cursor.to_list(length=None)
        
        if not logs:
            return {
                "total_time": 0,
                "avg_focus": 0,
                "lessons_completed": 0,
                "total_sessions": 0
            }
        
        # Calculate metrics
        total_time = len(logs) * 5  # Assuming 5 minutes per log
        avg_focus = sum(log.get("focus", 0) for log in logs) / len(logs)
        unique_lessons = len(set(log.get("lesson_id", "") for log in logs if log.get("lesson_id")))
        
        return {
            "total_time": total_time,
            "avg_focus": round(avg_focus, 1),
            "lessons_completed": unique_lessons,
            "total_sessions": len(logs)
        }
    
    except Exception as e:
        print(f"ERROR fetching reports summary: {e}")
        return {"error": str(e), "total_time": 0, "avg_focus": 0, "lessons_completed": 0, "total_sessions": 0}

@router.get("/reports/heatmap/{user_id}")
async def get_reports_heatmap(user_id: str):
    print(f"Fetching reports heatmap for user: {user_id}")
    try:
        # Get last 30 days of activity
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        cursor = emotion_logs_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": thirty_days_ago}
        }).sort("timestamp", 1)
        
        logs = await cursor.to_list(length=None)
        
        # Create heatmap data
        heatmap_data = {}
        for log in logs:
            date = log["timestamp"].strftime("%Y-%m-%d")
            if date not in heatmap_data:
                heatmap_data[date] = 0
            heatmap_data[date] += 1
        
        return {"heatmap": heatmap_data}
    
    except Exception as e:
        print(f"ERROR fetching reports heatmap: {e}")
        return {"error": str(e), "heatmap": {}}

@router.get("/reports/sessions/{user_id}")
async def get_reports_sessions(user_id: str):
    print(f"Fetching reports sessions for user: {user_id}")
    try:
        # Get recent sessions
        cursor = emotion_logs_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(50)
        logs = await cursor.to_list(length=None)
        
        # Group into sessions (assuming 30+ minutes gap = new session)
        sessions = []
        current_session = []
        
        for i, log in enumerate(logs):
            if i == 0:
                current_session = [log]
            else:
                time_diff = (logs[i-1]["timestamp"] - log["timestamp"]).total_seconds() / 60
                if time_diff > 30:  # 30 minutes gap = new session
                    if current_session:
                        sessions.append(current_session)
                    current_session = [log]
                else:
                    current_session.append(log)
        
        if current_session:
            sessions.append(current_session)
        
        # Format session data
        session_data = []
        for session in sessions[:10]:  # Last 10 sessions
            start_time = session[-1]["timestamp"].strftime("%I:%M %p")
            duration = len(session) * 5  # 5 minutes per log
            avg_focus = sum(log.get("focus", 0) for log in session) / len(session)
            
            session_data.append({
                "start_time": start_time,
                "duration": duration,
                "avg_focus": round(avg_focus, 1),
                "date": session[-1]["timestamp"].strftime("%b %d")
            })
        
        return {"sessions": session_data}
    
    except Exception as e:
        print(f"ERROR fetching reports sessions: {e}")
        return {"error": str(e), "sessions": []}

# from fastapi import Response
# from reportlab.lib.pagesizes import letter, A4
# from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
# from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
# from reportlab.lib import colors
# from reportlab.lib.units import inch
# import io
# import base64

# @router.post("/reports/download/{user_id}")
# async def download_report(user_id: str):
#     print(f"Generating PDF report for user: {user_id}")
#     try:
#         # Get user data
#         user = await user_collection.find_one({"_id": user_id})
#         user_name = user.get("name", "Student") if user else "Student"
        
#         # Get all data for report
#         summary = await get_reports_summary(user_id)
#         emotion_dist = await getEmotionDistribution(user_id)
#         peak_focus = await get_peak_focus_time(user_id)
#         consistency = await get_consistency_score(user_id)
        
#         # Create PDF
#         buffer = io.BytesIO()
#         doc = SimpleDocTemplate(buffer, pagesize=A4)
#         styles = getSampleStyleSheet()
#         story = []
        
#         # Title
#         title_style = ParagraphStyle(
#             'CustomTitle',
#             parent=styles['Heading1'],
#             fontSize=24,
#             spaceAfter=30,
#             alignment=1  # Center
#         )
#         story.append(Paragraph("Learning Progress Report", title_style))
#         story.append(Paragraph(f"Student: {user_name}", styles['Heading2']))
#         story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
#         story.append(Spacer(1, 20))
        
#         # Summary Section
#         story.append(Paragraph("Learning Summary", styles['Heading2']))
#         summary_data = [
#             ['Metric', 'Value'],
#             ['Total Time Spent', f"{summary.get('total_time', 0)} minutes"],
#             ['Average Focus', f"{summary.get('avg_focus', 0)}%"],
#             ['Lessons Completed', str(summary.get('lessons_completed', 0))],
#             ['Total Sessions', str(summary.get('total_sessions', 0))]
#         ]
#         summary_table = Table(summary_data)
#         summary_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
#             ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
#             ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#             ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
#             ('FONTSIZE', (0, 0), (-1, 0), 14),
#             ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
#             ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
#             ('GRID', (0, 0), (-1, -1), 1, colors.black)
#         ]))
#         story.append(summary_table)
#         story.append(Spacer(1, 20))
        
#         # Emotion Distribution
#         story.append(Paragraph("Emotion Distribution", styles['Heading2']))
#         if emotion_dist and not isinstance(emotion_dist, dict):
#             emotion_text = f"Happy: {emotion_dist.get('happy', 0)}, Neutral: {emotion_dist.get('neutral', 0)}, Sad: {emotion_dist.get('sad', 0)}"
#         else:
#             emotion_text = "No emotion data available"
#         story.append(Paragraph(emotion_text, styles['Normal']))
#         story.append(Spacer(1, 20))
        
#         # Performance Insights
#         story.append(Paragraph("Performance Insights", styles['Heading2']))
#         insights_data = [
#             ['Metric', 'Value'],
#             ['Peak Focus Time', peak_focus.get('peak_time', 'N/A')],
#             ['Peak Focus Average', f"{peak_focus.get('avg_focus', 0)}%"],
#             ['Learning Consistency', f"{consistency.get('consistency_score', 0)}%"]
#         ]
#         insights_table = Table(insights_data)
#         insights_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
#             ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
#             ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#             ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
#             ('FONTSIZE', (0, 0), (-1, 0), 14),
#             ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
#             ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
#             ('GRID', (0, 0), (-1, -1), 1, colors.black)
#         ]))
#         story.append(insights_table)
        
#         # Build PDF
#         doc.build(story)
#         buffer.seek(0)
        
#         # Return PDF
#         return Response(
#             content=buffer.getvalue(),
#             media_type="application/pdf",
#             headers={"Content-Disposition": f"attachment; filename=learning_report_{user_id}.pdf"}
#         )
    
#     except Exception as e:
#         print(f"ERROR generating PDF: {e}")
#         return {"error": str(e)}

