"""
Application configuration — loaded from environment variables.
"""
import os
import json
from functools import lru_cache
from typing import Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

# .env lives in the project root (parent of backend/)
_ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "AI ERP Platform"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    # JSON string in env: '["https://daynisc-web.onrender.com","http://localhost:3000"]'
    # Falls back to permissive list for local dev if not set.
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> list[str]:
        """Accept either a JSON string (from env) or a Python list."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # Single URL string — wrap in list
                return [v.strip()]
        if isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://localhost:5173"]

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://erp:password@localhost:5432/erp_db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── AWS S3 ────────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"  # Mumbai
    S3_BUCKET: str = "ai-erp-documents"
    S3_PRESIGN_EXPIRY: int = 3600

    # ── AI / OCR ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    AI_CONFIDENCE_THRESHOLD: float = 0.85  # Auto-approve above this
    OCR_FALLBACK: str = "tesseract"

    # ── Tally ─────────────────────────────────────────────────────────────────
    TALLY_DEFAULT_URL: str = "http://localhost:9000"
    TALLY_TIMEOUT: int = 30

    # ── GST Portal ────────────────────────────────────────────────────────────
    GST_CLIENT_ID: str = ""
    GST_CLIENT_SECRET: str = ""
    GST_SANDBOX: bool = True
    EINVOICE_BASE_URL: str = "https://einvoice1.gst.gov.in/eicore/v1.03"
    EWAY_BILL_BASE_URL: str = "https://ewaybillgst.gov.in/api/Authenticate"

    # ── WhatsApp ──────────────────────────────────────────────────────────────
    WHATSAPP_VERIFY_TOKEN: str = ""
    WHATSAPP_API_VERSION: str = "v19.0"
    WHATSAPP_BASE_URL: str = "https://graph.facebook.com"

    # ── SMS (MSG91) ───────────────────────────────────────────────────────────
    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""
    OTP_EXPIRY_SECONDS: int = 300

    # ── Email ─────────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.sendgrid.net"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@aierp.in"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
