"""Per-user book CRUD. Every route is scoped to the authenticated current_user."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Book, BookStatus, User
from ..schemas import BookCreate, BookRead, BookUpdate

router = APIRouter(prefix="/api/books", tags=["books"])


def _owned_book(book_id: int, user: User, db: Session) -> Book:
    book = db.execute(
        select(Book).where(Book.id == book_id, Book.owner_id == user.id)
    ).scalar_one_or_none()
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    return book


@router.get("", response_model=list[BookRead])
def list_books(
    status: BookStatus | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Book]:
    stmt = select(Book).where(Book.owner_id == user.id)
    if status is not None:
        stmt = stmt.where(Book.status == status)
    stmt = stmt.order_by(Book.created_at.desc(), Book.id.desc())
    return list(db.execute(stmt).scalars().all())


@router.post("", response_model=BookRead, status_code=201)
def create_book(
    body: BookCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Book:
    book = Book(
        owner_id=user.id,
        title=body.title.strip(),
        author=body.author.strip(),
        status=BookStatus.WANT_TO_READ,
        rating=None,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.patch("/{book_id}", response_model=BookRead)
def update_book(
    book_id: int,
    body: BookUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Book:
    book = _owned_book(book_id, user, db)

    if body.status is not None:
        book.status = body.status
        # Moving away from FINISHED drops any rating.
        if body.status != BookStatus.FINISHED:
            book.rating = None

    if body.rating is not None:
        # rating is validated 1-5 by the schema; only allowed on finished books.
        if book.status != BookStatus.FINISHED:
            raise HTTPException(status_code=400, detail="Rating is only allowed on finished books.")
        book.rating = body.rating

    db.commit()
    db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=204)
def delete_book(
    book_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    book = _owned_book(book_id, user, db)
    db.delete(book)
    db.commit()
