"""ORM models. Users own Books; Books carry a reading status + optional 1-5 rating."""
import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BookStatus(str, enum.Enum):
    WANT_TO_READ = "WANT_TO_READ"
    READING = "READING"
    FINISHED = "FINISHED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="USER")
    is_admin: Mapped[bool] = mapped_column(default=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    books: Mapped[list["Book"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    author: Mapped[str] = mapped_column(String(500))
    status: Mapped[BookStatus] = mapped_column(
        Enum(BookStatus, name="book_status"), default=BookStatus.WANT_TO_READ
    )
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    owner: Mapped["User"] = relationship(back_populates="books")


class Setting(Base):
    """Key/value store for admin-managed service credential overrides."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[str] = mapped_column(String(1024), default="")
