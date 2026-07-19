"""Demo seed. PLATFORM CONTRACT: print one `SEED_CRED <ROLE> <email> <password>` line per
demo account AND a single `SEED_CREDS_JSON [...]` line — the deploy parses stdout into
the deployment's demo credentials. Idempotent: re-asserts the password hash on every run
(upsert by email, updating BOTH create and update branches) so credentials never drift."""
import json

from sqlalchemy import select

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User

# reader@booknook.app is the demo account surfaced on the sign-in page hint.
DEMO_USERS = [
    {"role": "ADMIN", "email": "reader@booknook.app", "password": "password", "name": "Demo Reader"},
    {"role": "USER", "email": "user@example.com", "password": "User123!", "name": "Demo User"},
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    creds = []
    with SessionLocal() as db:
        for u in DEMO_USERS:
            is_admin = u["role"] == "ADMIN"
            password_hash = hash_password(u["password"])
            existing = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
            if existing is None:
                db.add(
                    User(
                        email=u["email"],
                        password_hash=password_hash,
                        role=u["role"],
                        is_admin=is_admin,
                        name=u["name"],
                    )
                )
            else:
                # Re-assert credentials + role on every run so the stored hash matches
                # the freshly emitted SEED_CRED line.
                existing.password_hash = password_hash
                existing.role = u["role"]
                existing.is_admin = is_admin
                existing.name = u["name"]
            print(f"SEED_CRED {u['role']} {u['email']} {u['password']}")
            creds.append({"role": u["role"], "email": u["email"], "password": u["password"]})
        db.commit()
    print(f"SEED_CREDS_JSON {json.dumps(creds)}")


if __name__ == "__main__":
    main()
