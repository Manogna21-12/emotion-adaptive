from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from database import notifications_collection

router = APIRouter(prefix="/notifications", tags=["notifications"])

# REST-style routes under /api/notifications (return updated list where applicable)
api_notifications_router = APIRouter(prefix="/api/notifications", tags=["notifications-api"])


class NotificationSchema(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool = False
    action_link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"
    action_link: Optional[str] = None


async def _fetch_notifications_for_user(
    user_id: str, limit: int = 20
) -> List[dict]:
    cursor = (
        notifications_collection.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    notifs = await cursor.to_list(length=limit)
    # Ensure they have an id field for frontend ease if needed, but Aliasing handles most
    for n in notifs:
        n["_id"] = str(n["_id"])
        # Handle cases where backend might have written "read" instead of "is_read"
        if "read" in n and "is_read" not in n:
            n["is_read"] = n["read"]
    return notifs


@router.get("/{user_id}", response_model=List[NotificationSchema])
async def get_notifications(
    user_id: str, limit: int = 20
):
    return await _fetch_notifications_for_user(user_id, limit)


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str, user_id: str
):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
        
    result = await notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read", "affected_rows": result.modified_count}


@router.patch("/user/{user_id}/read-all")
async def mark_all_as_read(user_id: str):
    result = await notifications_collection.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read", "affected_rows": result.modified_count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str, user_id: str
):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    result = await notifications_collection.delete_one(
        {"_id": ObjectId(notification_id), "user_id": user_id}
    )
    return {"message": "Notification deleted", "affected_rows": result.deleted_count}


@router.delete("/user/{user_id}/clear")
async def clear_all_notifications(user_id: str):
    result = await notifications_collection.delete_many({"user_id": user_id})
    return {"message": "All notifications cleared", "affected_rows": result.deleted_count}


# ─── /api/notifications — mutations return fresh list (frontend sets state directly) ───

@api_notifications_router.patch(
    "/read-all", response_model=List[NotificationSchema]
)
async def api_mark_all_notifications_read(
    user_id: str = Query(...)
):
    await notifications_collection.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return await _fetch_notifications_for_user(user_id)


@api_notifications_router.delete("/all", response_model=List[NotificationSchema])
async def api_clear_all_notifications(
    user_id: str = Query(...)
):
    """Clear every notification for this user; returns []."""
    await notifications_collection.delete_many({"user_id": user_id})
    return []


@api_notifications_router.patch(
    "/{notification_id}", response_model=List[NotificationSchema]
)
async def api_mark_notification_read(
    notification_id: str,
    user_id: str = Query(..., description="Notification owner (Mongo user id string)")
):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    await notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    return await _fetch_notifications_for_user(user_id)


@api_notifications_router.delete(
    "/{notification_id}", response_model=List[NotificationSchema]
)
async def api_delete_one_notification(
    notification_id: str,
    user_id: str = Query(...)
):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    await notifications_collection.delete_one(
        {"_id": ObjectId(notification_id), "user_id": user_id}
    )
    return await _fetch_notifications_for_user(user_id)


# Internal utility to create notifications
async def create_notification(
    user_id: str,
    title: str,
    message: str,
    type: str = "info",
    action_link: str = None
):
    new_notif = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "is_read": False,
        "action_link": action_link,
        "created_at": datetime.utcnow()
    }
    result = await notifications_collection.insert_one(new_notif)
    new_notif["_id"] = str(result.inserted_id)
    return new_notif


async def _ensure_db():
    """No-op for MongoDB as collections are auto-created, but we could initialize indexes here."""
    from database import init_db_indexes
    await init_db_indexes()
