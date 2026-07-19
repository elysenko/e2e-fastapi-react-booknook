"""Test harness: run against an isolated SQLite file so tests never touch the live DB.
DATABASE_URL must be set BEFORE importing app modules (database.py reads it at import)."""
import os
import tempfile

os.environ.setdefault("JWT_SECRET", "test-secret")
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app import models  # noqa: F401 — register mappings
from app.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def register(client, email="reader@example.com", password="password123"):
    res = client.post("/api/auth/register", json={"email": email, "password": password})
    assert res.status_code == 201, res.text
    return res.json()


def auth_headers(client, **kw):
    return {"Authorization": f"Bearer {register(client, **kw)['token']}"}
