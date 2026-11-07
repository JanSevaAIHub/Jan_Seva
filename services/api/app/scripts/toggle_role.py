"""Toggle demo user role between citizen and officer in live PostgreSQL."""
import sys
from app.db import get_engine
from sqlalchemy import text
from sqlalchemy.orm import Session

def toggle_role(target_role: str | None = None):
    session = Session(get_engine())
    current = session.execute(text("SELECT user_id, name, role FROM profiles LIMIT 1")).fetchone()
    if not current:
        print("No profile found.")
        return
    uid, name, role = current
    new_role = target_role or ("officer" if role == "citizen" else "citizen")
    new_name = "R. Singh (Officer)" if new_role == "officer" else "Arjun Mishra (Citizen)"
    session.execute(
        text("UPDATE profiles SET role = :role, name = :name WHERE user_id = :uid"),
        {"role": new_role, "name": new_name, "uid": uid}
    )
    session.commit()
    print(f"Profile {uid} updated: {role} -> {new_role} ({new_name})")

if __name__ == "__main__":
    role_arg = sys.argv[1] if len(sys.argv) > 1 else None
    toggle_role(role_arg)

