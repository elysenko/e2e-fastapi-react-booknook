"""Auth routes: register (first user becomes admin), login, and current-user."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, sign_token, verify_password
from ..database import get_db
from ..models import User
from ..schemas import AuthResponse, UserCreate, UserRead
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    """Login accepts raw email/password (no length constraints → bad creds return 401)."""

    email: str
    password: str


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(body: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    email = body.email.lower()
    exists = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    is_first = db.execute(select(func.count()).select_from(User)).scalar_one() == 0
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        is_admin=is_first,
        role="ADMIN" if is_first else "USER",
        name=email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=sign_token(user), user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginBody, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.execute(select(User).where(User.email == body.email.lower())).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return AuthResponse(token=sign_token(user), user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)
