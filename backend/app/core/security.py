import hmac
import hashlib
import time
from typing import Optional
from fastapi import Depends, HTTPException, Security, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.auth import User
from backend.app.integrations.firebase_auth import verify_firebase_id_token

security_scheme = HTTPBearer(auto_error=False)

def sign_session_cookie(user_id: str, email: str, role: str) -> str:
    """
    Creates an HMAC-signed session cookie value: userId|email|role|timestamp|signature
    """
    ts = str(int(time.time()))
    payload = f"{user_id}|{email}|{role}|{ts}"
    sig = hmac.new(
        settings.SESSION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{payload}|{sig}"

def verify_session_cookie(cookie_val: str) -> Optional[dict]:
    if not cookie_val or "|" not in cookie_val:
        return None
    parts = cookie_val.split("|")
    if len(parts) != 5:
        return None
    user_id, email, role, ts, sig = parts
    payload = f"{user_id}|{email}|{role}|{ts}"
    expected_sig = hmac.new(
        settings.SESSION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_sig, sig):
        return None
    # Check max age (14 days)
    try:
        ts_int = int(ts)
        if time.time() - ts_int > (settings.SESSION_COOKIE_MAX_AGE_DAYS * 86400):
            return None
    except ValueError:
        return None
    return {"user_id": user_id, "email": email, "role": role}

def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    # 1. Check Bearer token
    if credentials and credentials.credentials:
        token = credentials.credentials
        decoded = verify_firebase_id_token(token)
        if decoded:
            uid = decoded.get("uid")
            email = decoded.get("email")
            user = db.query(User).filter(User.firebase_uid == uid).first()
            if not user and email:
                user = db.query(User).filter(User.email == email).first()
            if not user and uid and email:
                # Upsert user record
                user = User(
                    id=f"usr_{uid[:20]}",
                    firebase_uid=uid,
                    email=email,
                    display_name=decoded.get("name"),
                    photo_url=decoded.get("picture"),
                    role=decoded.get("role", "customer")
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user

    # 2. Check signed session cookie
    cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if cookie:
        verified = verify_session_cookie(cookie)
        if verified:
            user = db.query(User).filter(User.id == verified["user_id"]).first()
            return user

    return None

def get_current_user(user: Optional[User] = Depends(get_optional_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return user
