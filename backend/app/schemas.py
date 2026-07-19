"""Pydantic request/response schemas (mirrored by web/src/types.ts)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import BookStatus


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_admin: bool
    role: str
    created_at: datetime


class AuthResponse(BaseModel):
    token: str
    user: UserRead


class Token(BaseModel):
    token: str


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    author: str = Field(min_length=1, max_length=500)


class BookUpdate(BaseModel):
    status: BookStatus | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class BookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    status: BookStatus
    rating: int | None
    created_at: datetime
