import logging
import json
from typing import Optional, Dict, Any
from backend.app.core.config import settings

logger = logging.getLogger("firebase_auth")

_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    
    try:
        import firebase_admin
        from firebase_admin import credentials
        
        if settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                "client_email": settings.FIREBASE_CLIENT_EMAIL
            }
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            # Initialize with default credentials or project id
            _firebase_app = firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
        return _firebase_app
    except Exception as e:
        logger.warning("Could not initialize Firebase Admin SDK: %s. Using token verification fallback / test mode.", e)
        return None

def verify_firebase_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Firebase ID token.
    Returns decoded token dictionary or None if invalid.
    """
    if not id_token:
        return None

    # Handle local dev / test tokens
    if settings.AUTH_TEST_MODE:
        if id_token.startswith("mock_token_") or id_token == "test-admin-token":
            is_admin = (id_token == "test-admin-token" or "admin" in id_token)
            return {
                "uid": "usr_dev_test_user_01",
                "email": "sarvesh@aurorastore.internal" if is_admin else "customer@aurorastore.internal",
                "name": "Dev Admin" if is_admin else "Dev Customer",
                "picture": None,
                "email_verified": True,
                "role": "admin" if is_admin else "customer"
            }

    try:
        from firebase_admin import auth
        app = get_firebase_app()
        if app:
            decoded = auth.verify_id_token(id_token, app=app)
            return decoded
    except Exception as e:
        logger.warning("Firebase Admin token verification failed: %s", e)

    # Public cert fallback if needed or return None
    return None
