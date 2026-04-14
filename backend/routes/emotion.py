from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import emotion_logs_collection
import cv2
import numpy as np
import base64
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
# Lazy import (do NOT import DeepFace at startup).
DeepFace = None

router = APIRouter(
    prefix="/detect-emotion",
    tags=["Emotion Detection"]
)

class ImageInput(BaseModel):
    image: str

@router.post("")
async def detect_emotion(data: ImageInput):
    try:
        global DeepFace
        if DeepFace is None:
            try:
                from deepface import DeepFace as _DeepFace

                DeepFace = _DeepFace
            except Exception:
                return {"error": "Emotion detection is unavailable (DeepFace dependency not available)."}

        print("Request received")
        
        # Extract base64 image
        if "," in data.image:
            image_data = data.image.split(",")[1]
        else:
            image_data = data.image

        img_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image"}

        print("Image decoded successfully")

        # Use DeepFace
        result = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)

        emotion = result[0]['dominant_emotion']
        confidence = result[0]['emotion'][emotion]

        print("Detected emotion:", emotion)

        # INSERT MONGODB
        emotion_data = {
            "user_id": "test_user",
            "lesson_id": "test_lesson",
            "emotion": emotion,
            "focus": int(confidence),
            "timestamp": datetime.utcnow()
        }

        # Synchronous PyMongo insertion to match the active database wrapper
        emotion_logs_collection.insert_one(emotion_data)
        print("Inserted into MongoDB")

        return {
            "emotion": emotion,
            "confidence": float(confidence)
        }
        
    except Exception as e:
        print("ERROR:", str(e))
        return {"error": str(e)}
