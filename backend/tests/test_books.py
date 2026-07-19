from tests.conftest import auth_headers, register


def test_books_require_auth(client):
    assert client.get("/api/books").status_code == 401
    assert client.post("/api/books", json={"title": "T", "author": "A"}).status_code == 401


def test_add_book_defaults_want_to_read(client):
    h = auth_headers(client)
    res = client.post("/api/books", json={"title": "Dune", "author": "Frank Herbert"}, headers=h)
    assert res.status_code == 201
    book = res.json()
    assert book["status"] == "WANT_TO_READ"
    assert book["rating"] is None
    assert book["title"] == "Dune"


def test_update_status_to_reading(client):
    h = auth_headers(client)
    book = client.post("/api/books", json={"title": "Dune", "author": "FH"}, headers=h).json()
    res = client.patch(f"/api/books/{book['id']}", json={"status": "READING"}, headers=h)
    assert res.status_code == 200
    assert res.json()["status"] == "READING"


def test_finish_and_rate(client):
    h = auth_headers(client)
    book = client.post("/api/books", json={"title": "Dune", "author": "FH"}, headers=h).json()
    res = client.patch(f"/api/books/{book['id']}", json={"status": "FINISHED", "rating": 5}, headers=h)
    assert res.status_code == 200
    assert res.json()["status"] == "FINISHED"
    assert res.json()["rating"] == 5


def test_rating_rejected_when_not_finished(client):
    h = auth_headers(client)
    book = client.post("/api/books", json={"title": "Dune", "author": "FH"}, headers=h).json()
    res = client.patch(f"/api/books/{book['id']}", json={"rating": 4}, headers=h)
    assert res.status_code == 400


def test_rating_out_of_range_rejected(client):
    h = auth_headers(client)
    book = client.post("/api/books", json={"title": "Dune", "author": "FH"}, headers=h).json()
    res = client.patch(f"/api/books/{book['id']}", json={"status": "FINISHED", "rating": 9}, headers=h)
    assert res.status_code == 422


def test_moving_off_finished_clears_rating(client):
    h = auth_headers(client)
    book = client.post("/api/books", json={"title": "Dune", "author": "FH"}, headers=h).json()
    client.patch(f"/api/books/{book['id']}", json={"status": "FINISHED", "rating": 5}, headers=h)
    res = client.patch(f"/api/books/{book['id']}", json={"status": "READING"}, headers=h)
    assert res.json()["rating"] is None


def test_status_filter(client):
    h = auth_headers(client)
    b1 = client.post("/api/books", json={"title": "A", "author": "x"}, headers=h).json()
    client.post("/api/books", json={"title": "B", "author": "y"}, headers=h)
    client.patch(f"/api/books/{b1['id']}", json={"status": "READING"}, headers=h)
    reading = client.get("/api/books?status=READING", headers=h).json()
    assert len(reading) == 1
    assert reading[0]["status"] == "READING"
    want = client.get("/api/books?status=WANT_TO_READ", headers=h).json()
    assert len(want) == 1


def test_delete_book(client):
    h = auth_headers(client)
    book = client.post("/api/books", json={"title": "A", "author": "x"}, headers=h).json()
    assert client.delete(f"/api/books/{book['id']}", headers=h).status_code == 204
    assert client.get("/api/books", headers=h).json() == []


def test_books_scoped_per_user(client):
    h1 = auth_headers(client, email="u1@example.com")
    h2 = auth_headers(client, email="u2@example.com")
    book = client.post("/api/books", json={"title": "Private", "author": "x"}, headers=h1).json()
    # u2 cannot see or modify u1's book.
    assert client.get("/api/books", headers=h2).json() == []
    assert client.patch(f"/api/books/{book['id']}", json={"status": "READING"}, headers=h2).status_code == 404
    assert client.delete(f"/api/books/{book['id']}", headers=h2).status_code == 404


def test_admin_settings_admin_only(client):
    admin_h = auth_headers(client, email="admin@example.com")  # first user → admin
    user_h = auth_headers(client, email="plain@example.com")
    assert client.get("/api/admin/settings", headers=admin_h).status_code == 200
    assert client.get("/api/admin/settings", headers=user_h).status_code == 403
