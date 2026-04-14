import os
import logging
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.requests import Request
from starlette.responses import Response as StarletteResponse
from dotenv import load_dotenv

from routes.auth import router as auth_router, login as auth_login
from routes.learning import router as learning_router, catalog_router as catalog_learning_router
from routes.dashboard import router as dashboard_router
from routes.reports import router as reports_router
from routes.progress_pg import router as progress_router
from routes.streak import router as streak_router
from routes.notifications import router as notifications_router, api_notifications_router
from routes.quizzes import router as quizzes_router
from database import init_db_indexes
from models import UserLogin
import config  # Import config to initialize cloudinary
import asyncio
import time

os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Load env vars from .env (local dev)
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("emotion_api")

app = FastAPI(title="Emotion Adaptive Learning - Backend")

origins = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Production (Vercel — update VITE_FRONTEND_URL in Render env vars to match your exact domain)
    os.getenv("FRONTEND_URL", "https://emotion-adaptive.vercel.app"),
    # Allow wildcard subdomains on vercel.app in preview deployments
    "https://emotion-adaptive-main.vercel.app",
]
# Remove any empty strings caused by unset env vars
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

class RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response: StarletteResponse | None = None
        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            status = getattr(response, "status_code", "ERR")
            print(
                f"{request.method} {request.url.path} -> {status} "
                f"({duration_ms:.1f}ms) origin={request.headers.get('origin')}"
            )

app.add_middleware(RequestLogMiddleware)

app.include_router(auth_router)
app.include_router(learning_router)
app.include_router(catalog_learning_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(progress_router)
app.include_router(streak_router)
app.include_router(notifications_router)
app.include_router(api_notifications_router)
app.include_router(quizzes_router)

@app.on_event("startup")
async def startup_event():
    port = os.getenv("PORT", "8000")
    log.info(
        "API startup: title=%s port_env=%s cors_origins=%s",
        app.title,
        port,
        origins,
    )
    log.info("Health check: GET /health")
    # Don't crash the API if Mongo is down; log instead.
    try:
        await asyncio.wait_for(init_db_indexes(), timeout=10)
        log.info("MongoDB indexes initialized (or skipped if already exist).")
    except Exception as e:
        log.warning("MongoDB index init skipped or failed: %s", e)

    # Initialize SQL Database (SQLite/Postgres)
    try:
        from routes.reports import _ensure_db
        from routes.notifications import _ensure_db as _ensure_notifications_db
        await _ensure_db()
        await _ensure_notifications_db()
        log.info("SQL Database initialized successfully (reports.db and notifications table)")
    except Exception as e:
        log.error("SQL Database init failed: %s", e)

@app.post("/login")
async def root_login(payload: UserLogin):
    print(f"[auth] POST /login email={getattr(payload, 'email', None)}")
    return await auth_login(payload)

@app.get("/")
def root():
    return {"message": "Emotion Adaptive Learning API is running"}


@app.get("/health")
def health():
    """Liveness probe for frontend and load balancers (no DB dependency)."""
    return {"status": "OK", "service": "emotion-adaptive-learning-api"}
