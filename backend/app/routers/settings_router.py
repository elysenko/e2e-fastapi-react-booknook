"""Admin-only service settings. Defaults are read from the platform-injected env
(single-namespace runtime contract — never hardcode hosts); admin overrides persist in
the settings table. Secret values are masked when read back."""
import os
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Setting, User

router = APIRouter(prefix="/api/admin/settings", tags=["admin"])

MASK = "••••••••"


def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")


def _env_defaults() -> dict[str, str]:
    url = urlparse(os.environ.get("DATABASE_URL", ""))
    minio = urlparse(os.environ.get("MINIO_ENDPOINT", ""))
    return {
        "pg_host": os.environ.get("DATABASE_HOST") or url.hostname or "",
        "pg_database": os.environ.get("DATABASE_NAME") or (url.path.lstrip("/") if url.path else ""),
        "pg_user": os.environ.get("DATABASE_USER") or url.username or "",
        "pg_password": os.environ.get("DATABASE_PASSWORD") or (url.password or ""),
        "minio_endpoint": os.environ.get("MINIO_ENDPOINT") or minio.geturl(),
        "minio_bucket": os.environ.get("MINIO_BUCKET", "booknook"),
        "minio_access_key": os.environ.get("MINIO_ROOT_USER", ""),
        "minio_secret_key": os.environ.get("MINIO_ROOT_PASSWORD", ""),
    }


def _stored(db: Session) -> dict[str, str]:
    return {s.key: s.value for s in db.execute(select(Setting)).scalars().all()}


def _serialize(db: Session) -> list[dict]:
    values = {**_env_defaults(), **_stored(db)}

    def field(key: str, label: str, secret: bool) -> dict:
        raw = values.get(key, "")
        return {"key": key, "label": label, "value": (MASK if raw else "") if secret else raw, "secret": secret}

    pg_fields = [
        field("pg_host", "Host", False),
        field("pg_database", "Database", False),
        field("pg_user", "User", False),
        field("pg_password", "Password", True),
    ]
    minio_fields = [
        field("minio_endpoint", "Endpoint", False),
        field("minio_bucket", "Bucket", False),
        field("minio_access_key", "Access Key", True),
        field("minio_secret_key", "Secret Key", True),
    ]
    return [
        {
            "service": "postgresql",
            "label": "PostgreSQL",
            "configured": any(values.get(f["key"]) for f in pg_fields),
            "fields": pg_fields,
        },
        {
            "service": "minio",
            "label": "MinIO Object Storage",
            "configured": any(values.get(f["key"]) for f in minio_fields),
            "fields": minio_fields,
        },
    ]


@router.get("")
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    _require_admin(user)
    return _serialize(db)


@router.patch("")
def update_settings(
    patch: dict[str, str],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    _require_admin(user)
    for key, value in patch.items():
        if not value:
            continue
        existing = db.get(Setting, key)
        if existing is None:
            db.add(Setting(key=key, value=value))
        else:
            existing.value = value
    db.commit()
    return _serialize(db)
