from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
import jwt
import os
from bson import ObjectId

from database import users_collection
from models import UserCreate, UserLogin, EmailSchema, ResetPasswordSchema
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_IN = 60 * 60 * 24

# SMTP Configuration (Gmail recommended)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
# Preferred environment variable names as per request
SMTP_USERNAME = os.getenv("EMAIL_USER", os.getenv("SMTP_USERNAME", ""))
SMTP_PASSWORD = os.getenv("EMAIL_PASS", os.getenv("SMTP_PASSWORD", ""))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/auth", tags=["auth"])

http_bearer = HTTPBearer(auto_error=False)

def send_reset_email(to_email: str, reset_link: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"\n[MOCK EMAIL] Reset link for {to_email}:\n{reset_link}\n(EMAIL_USER/EMAIL_PASS not configured; set env vars to enable real email delivery.)\n")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = "Reset Your Password - EmotiLearn"

        body = f"""Hello,

You have requested to reset your password.
Please click the link below to complete the password reset process:

{reset_link}

If you did not request this, ignore this email.

Best regards,
EmotiLearn Team"""
        msg.attach(MIMEText(body, 'plain'))

        print(f"[INFO] Connecting to SMTP {SMTP_SERVER}:{SMTP_PORT} as {SMTP_USERNAME}")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30)
        server.ehlo()
        server.starttls()
        server.ehlo()

        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, [to_email], msg.as_string())
        server.quit()

        print(f"[INFO] Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
        return False

@router.post("/signup")
async def signup(user: UserCreate):
    existing = await users_collection.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())

    user_data = {
        "name": user.name.strip(),
        "email": user.email.lower(),
        "password": hashed_password.decode('utf-8'),
        "role": user.role,
    }

    result = await users_collection.insert_one(user_data)
    return {
        "status": "success",
        "user_id": str(result.inserted_id),
        "name": user.name.strip(),
        "role": user.role,
    }


@router.post("/login")
async def login(credentials: UserLogin):
    user = await users_collection.find_one(
        {"email": credentials.email.lower()},
        {"name": 1, "email": 1, "password": 1, "role": 1},
    )

    if not user:
        print(f"[auth] ❌ Login failed: User not found for email {credentials.email.lower()}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Robust password check ...
    print(f"[auth] 🔍 Verifying password for {credentials.email.lower()}...")

    # Robust password check (handles both string and binary storage)
    stored_password = user["password"]
    if isinstance(stored_password, str):
        stored_password = stored_password.encode('utf-8')
    
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), stored_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    role = user.get("role", "student")
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": role,
        "name": user.get("name", ""),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=JWT_EXPIRES_IN),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Trigger "Welcome back" notification
    try:
        from routes.notifications import create_notification
        # Fire and forget or await? Awaiting is safer for persistence.
        await create_notification(
            user_id=str(user["_id"]),
            title="Welcome back! 👋",
            message=f"Ready to continue your learning journey, {user.get('name', 'Student')}?",
            type="success"
        )
    except Exception as e:
        print(f"Failed to create login notification: {e}")

    # ── Auto-create SQL session on login (production session tracking) ──
    try:
        from pg_db import init_pg, async_session_factory
        from pg_models import StudentStats
        from sqlalchemy import select as sa_select

        init_pg()
        if async_session_factory:
            async with async_session_factory() as sql_db:
                uid_str = str(user["_id"])
                now_utc = datetime.now(timezone.utc)

                stmt = sa_select(StudentStats).where(StudentStats.user_id == uid_str)
                res = await sql_db.execute(stmt)
                stats = res.scalar_one_or_none()

                if not stats:
                    stats = StudentStats(
                        user_id=uid_str,
                        total_time=0,
                        sessions=1,
                        current_streak=1,
                        last_active_date=now_utc,
                    )
                    sql_db.add(stats)
                    print(f"[auth] ✅ Created initial SQL stats for {uid_str}")
                else:
                    stats.sessions += 1
                    # Streak logic: consecutive day → +1, gap → reset to 1
                    if stats.last_active_date:
                        last_date = stats.last_active_date.date()
                        today_date = now_utc.date()
                        diff = (today_date - last_date).days
                        if diff == 1:
                            stats.current_streak += 1
                        elif diff > 1:
                            stats.current_streak = 1
                        # diff == 0 → same day, keep streak unchanged
                    else:
                        stats.current_streak = 1
                    stats.last_active_date = now_utc
                    print(f"[auth] ✅ Session #{stats.sessions} for {uid_str}, streak={stats.current_streak}")

                await sql_db.commit()
    except Exception as sql_err:
        print(f"[auth] ⚠️ SQL session tracking on login failed (non-fatal): {sql_err}")

    return {
        "status": "success",
        "user_id": str(user["_id"]),
        "name": user.get("name", ""),
        "role": role,
        "token": token,
    }


@router.get("/me")
async def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(http_bearer)
    ] = None,
    user_id: Optional[str] = None,
):
    """Current user from Bearer JWT (preferred) or legacy ?user_id= query param."""
    uid: Optional[str] = None

    if credentials and credentials.scheme.lower() == "bearer":
        try:
            payload = jwt.decode(
                credentials.credentials,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM],
            )
            uid = payload.get("user_id")
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired. Please log in again.",
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token.",
            )
    elif user_id:
        uid = user_id

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    try:
        user = await users_collection.find_one({"_id": ObjectId(uid)})
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "student"),
    }

@router.post("/forgot-password")
async def forgot_password(payload: EmailSchema):
    email = payload.email.lower()
    user = await users_collection.find_one({"email": email})
    
    # We return the same success message even if the email is not found to prevent email enumeration.
    if not user:
        return {"message": "If that email is in our database, we will send a password reset link to it."}
        
    # Generate token valid for 30 minutes
    reset_payload = {
        "sub": str(user["_id"]),
        "type": "reset",
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    
    reset_token = jwt.encode(reset_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    email_sent = send_reset_email(email, reset_link)
    if not email_sent:
        # For existing user we must expose failure to fix config; avoid email enumeration in non-existing case.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to send reset email. Check backend logs for SMTP errors.")

    return {"message": "If that email is in our database, we will send a password reset link to it."}

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordSchema):
    try:
        decoded_token = jwt.decode(payload.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if decoded_token.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Invalid token type.")
            
        user_id = decoded_token.get("sub")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid token payload.")
            
        # Hash new password
        hashed_password = bcrypt.hashpw(payload.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update user
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": hashed_password}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="User not found or password not changed.")
            
        return {"message": "Password has been successfully reset."}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid reset token.")
@router.delete("/delete-account/{user_id}")
async def delete_account(user_id: str):
    """
    Permanently deletes a user account and all associated data across all collections.
    This is a destructive action and cannot be undone.
    """
    from database import (
        users_collection, 
        emotion_logs_collection, 
        notifications_collection, 
        userstats_collection, 
        reports_collection,
        learning_sessions_collection
    )
    
    print(f"[auth] Attempting to delete account: {user_id}")
    
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # 1. Verify user exists
    user = await users_collection.find_one({"_id": oid})
    if not user:
        # Check if ID was stored as string
        user = await users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
    # Normalize ID for other deletions (often stored as string in subs)
    uid_str = str(user["_id"])

    # 2. Cascading Deletions (MongoDB)
    match_query = {"$or": [{"user_id": uid_str}, {"userId": uid_str}, {"user_id": oid}, {"userId": oid}]}
    await emotion_logs_collection.delete_many(match_query)
    await notifications_collection.delete_many(match_query)
    await userstats_collection.delete_many({"user_id": uid_str})
    await learning_sessions_collection.delete_many(match_query)
    await reports_collection.delete_many(match_query)
    
    # 3. Cascading Deletions (SQL/Postgres)
    try:
        from pg_db import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM sessions WHERE user_id = :uid"), {"uid": uid_str})
            await conn.execute(text("DELETE FROM reports WHERE user_id = :uid"), {"uid": uid_str})
            await conn.execute(text("DELETE FROM notifications WHERE user_id = :uid"), {"uid": uid_str})
            await conn.execute(text("DELETE FROM quiz_results WHERE user_id = :uid"), {"uid": uid_str})
            await conn.execute(text("DELETE FROM progress WHERE user_id = :uid"), {"uid": uid_str})
    except Exception as sql_err:
        print(f"SQL Cleanup warning: {sql_err}")

    # 4. Delete Main User Record
    del_user = await users_collection.delete_one({"$or": [{"_id": oid}, {"_id": uid_str}]})
    
    return {
        "status": "success",
        "message": "Account and all associated records have been permanently deleted.",
        "details": {
            "sql_cleanup": "completed",
            "mongodb_user": del_user.deleted_count
        }
    }
