from tests.conftest import register


def test_register_first_user_is_admin(client):
    body = register(client, email="first@example.com")
    assert body["user"]["is_admin"] is True
    assert body["user"]["role"] == "ADMIN"
    assert body["token"]


def test_second_user_is_not_admin(client):
    register(client, email="first@example.com")
    second = register(client, email="second@example.com")
    assert second["user"]["is_admin"] is False
    assert second["user"]["role"] == "USER"


def test_duplicate_email_rejected(client):
    register(client, email="dup@example.com")
    res = client.post("/api/auth/register", json={"email": "dup@example.com", "password": "password123"})
    assert res.status_code == 409


def test_login_success(client):
    register(client, email="login@example.com", password="secret123")
    res = client.post("/api/auth/login", json={"email": "login@example.com", "password": "secret123"})
    assert res.status_code == 200
    assert res.json()["token"]


def test_login_bad_password_401(client):
    register(client, email="login@example.com", password="secret123")
    res = client.post("/api/auth/login", json={"email": "login@example.com", "password": "wrong"})
    assert res.status_code == 401


def test_login_unknown_user_401(client):
    res = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever"})
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client):
    body = register(client, email="me@example.com")
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_health_endpoints(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/health/deep").json()["status"] == "ok"
