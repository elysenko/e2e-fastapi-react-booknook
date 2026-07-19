"""FastAPI app entry. Serve contract: uvicorn on PORT=3000 behind the nginx /api proxy
(web/nginx.conf strips nothing — all API routes are mounted under /api). Keep
GET /api/health intact: the platform's backend reachability probe depends on it."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import engine
from .routers import auth_router, books_router, settings_router

app = FastAPI(title="booknook-backend", docs_url="/api/docs", openapi_url="/api/openapi.json")

# CORS: same-origin in prod (nginx proxies /api), permissive for local dev proxies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(books_router.router)
app.include_router(settings_router.router)


@app.get("/api/health")
def health() -> dict:
    """Liveness probe (no DB dependency) — platform backend reachability check."""
    return {"status": "ok"}


@app.get("/api/health/deep")
def health_deep() -> dict:
    """Readiness probe: verifies the database connection is live."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - surfaced as degraded payload
        return {"status": "degraded", "database": "unreachable", "detail": str(exc)[:200]}
    return {"status": "ok", "database": "ok"}
