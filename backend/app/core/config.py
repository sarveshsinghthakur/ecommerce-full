import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Aurora Store API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://neondb_owner:npg_Y8ZlXUckB5jq@ep-icy-shape-a1dcm789-pooler.ap-southeast-1.aws.neon.tech/ecommerce?sslmode=require",
        description="Neon PostgreSQL connection string"
    )

    # Security & Sessions
    SESSION_SECRET: str = Field(
        default="aurora-dev-session-secret-change-in-production-min-32-chars",
        description="HMAC signing secret for session cookies"
    )
    SESSION_COOKIE_NAME: str = "aurora_session"
    SESSION_COOKIE_MAX_AGE_DAYS: int = 14

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Firebase Auth
    FIREBASE_PROJECT_ID: str = "aurora-store-demo"
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    AUTH_TEST_MODE: bool = True  # Allows mocked test user authentication in local dev

    # Paytm Payment Gateway
    PAYTM_ENVIRONMENT: str = "staging"  # "staging" or "production"
    PAYTM_MID: str = "TEST_MERCHANT_ID"
    PAYTM_MERCHANT_KEY: str = "TEST_MERCHANT_KEY"
    PAYTM_WEBSITE: str = "WEBSTAGING"
    PAYTM_CHANNEL_ID: str = "WEB"
    PAYTM_INDUSTRY_TYPE_ID: str = "Retail"
    PAYTM_CALLBACK_URL: str = "http://localhost:8000/api/v1/payments/paytm/callback"
    PAYTM_FRONTEND_RETURN_URL: str = "http://localhost:3000/orders"

    # Store Defaults
    CURRENCY: str = "INR"
    FREE_SHIPPING_THRESHOLD: float = 999.0
    DEFAULT_SHIPPING_FEE: float = 99.0
    DEFAULT_TAX_RATE: float = 0.18

settings = Settings()
