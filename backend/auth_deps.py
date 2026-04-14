"""JWT dependencies for protecting FastAPI routes (optional use in routers)."""

from typing import Annotated, Optional

import jwt
import os
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import users_collection

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"

http_bearer = HTTPBearer(auto_error=False)


async def get_token_payload(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(http_bearer)
    ] = None,
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        return jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )


async def require_user_id(payload: Annotated[dict, Depends(get_token_payload)]) -> str:
    uid = payload.get("user_id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )
    return uid


async def require_user_doc(
    user_id: Annotated[str, Depends(require_user_id)],
) -> dict:
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return user
