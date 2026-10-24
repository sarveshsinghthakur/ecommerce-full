import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.config import settings
from backend.app.core.security import (
    get_current_user, get_optional_user, sign_session_cookie
)
from backend.app.models.auth import User, UserAddress
from backend.app.schemas.auth import SessionRequest, UserOut, AddressCreate, AddressOut
from backend.app.integrations.firebase_auth import verify_firebase_id_token
from backend.app.services.cart_service import merge_session_cart

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/session", response_model=UserOut)
def create_session(
    payload: SessionRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    decoded = verify_firebase_id_token(payload.id_token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")

    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid or not email:
        raise HTTPException(status_code=400, detail="Malformed Firebase token claims")

    # Locate or create user
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
    
    if not user:
        user = User(
            id=f"usr_{uuid.uuid4().hex[:16]}",
            firebase_uid=uid,
            email=email,
            email_verified=decoded.get("email_verified", False),
            display_name=decoded.get("name"),
            photo_url=decoded.get("picture"),
            role="customer"
        )
        db.add(user)
    else:
        user.firebase_uid = uid
        if decoded.get("name"):
            user.display_name = decoded.get("name")
        if decoded.get("picture"):
            user.photo_url = decoded.get("picture")

    db.commit()
    db.refresh(user)

    # Merge guest cart if cart_session exists
    cart_session = request.cookies.get("cart_session")
    if cart_session:
        merge_session_cart(db, session_id=cart_session, user_id=user.id)

    # Set HMAC session cookie
    cookie_value = sign_session_cookie(user.id, user.email, user.role)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=cookie_value,
        max_age=settings.SESSION_COOKIE_MAX_AGE_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False  # Allow http in local dev
    )

    return user

@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)
    return {"success": True, "message": "Logged out successfully"}

@router.get("/addresses", response_model=List[AddressOut])
def get_addresses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(UserAddress).filter(UserAddress.user_id == user.id).all()

@router.post("/addresses", response_model=AddressOut)
def add_address(
    payload: AddressCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    addr = UserAddress(
        id=f"adr_{uuid.uuid4().hex[:16]}",
        user_id=user.id,
        label=payload.label,
        full_name=payload.full_name,
        phone=payload.phone,
        line1=payload.line1,
        line2=payload.line2,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postal_code,
        country=payload.country,
        is_default_shipping=payload.is_default_shipping
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr
