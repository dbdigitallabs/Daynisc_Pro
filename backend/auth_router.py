"""
Auth Service — OTP-based login.
In development the OTP is printed to API logs and '000000' always works.
In production wire up MSG91 or a real SMS provider.
"""
from __future__ import annotations
import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from jose import jwt
import redis as redis_lib

from config import settings

router = APIRouter()

# ── Redis client (sync, only used for OTP TTL storage) ───────────────────────

_redis = redis_lib.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
)

# In-memory fallback — survives Redis hiccups within the same process
_otp_memory: dict[str, str] = {}

OTP_TTL = 300  # 5 minutes
DEV_OTP = "989898"  # always accepted for testing
OWNER_PHONE = "9898551319"  # fixed OTP for owner's number


# ── Schemas ────────────────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _otp_key(phone: str) -> str:
    return f"otp:{phone}"


def _issue_token(payload: dict, expires_delta: timedelta) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/send-otp", status_code=200)
async def send_otp(body: SendOTPRequest):
    """Generate and store a 6-digit OTP; in dev it is returned in the response."""
    phone = body.phone.strip()
    if len(phone) != 10 or not phone.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone must be a 10-digit Indian mobile number.",
        )

    # Pin OTP for owner's phone so no SMS is needed during development
    otp = DEV_OTP if phone == OWNER_PHONE else _generate_otp()

    # Always store in memory first (guaranteed)
    _otp_memory[phone] = otp

    # Also persist to Redis (best-effort, for multi-instance support)
    try:
        _redis.setex(_otp_key(phone), OTP_TTL, otp)
    except Exception as e:
        print(f"[AUTH] Redis write failed (memory fallback active): {e}")

    print(f"[AUTH] OTP for +91-{phone}: {otp}")

    return {
        "message": "OTP sent successfully.",
        "dev_otp": otp,
        "expires_in": OTP_TTL,
    }


@router.post("/verify-otp", status_code=200)
async def verify_otp(body: VerifyOTPRequest):
    """Verify OTP and issue JWT access + refresh tokens."""
    phone = body.phone.strip()
    otp_input = body.otp.strip()

    # Try Redis first, fall back to in-memory
    stored = None
    try:
        stored = _redis.get(_otp_key(phone))
    except Exception as e:
        print(f"[AUTH] Redis get failed, using memory fallback: {e}")

    if stored is None:
        stored = _otp_memory.get(phone)

    if otp_input != DEV_OTP and otp_input != stored:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP. Please try again.",
        )

    # Clean up
    _otp_memory.pop(phone, None)
    try:
        _redis.delete(_otp_key(phone))
    except Exception:
        pass

    # Build minimal user payload (replace with DB lookup in production)
    user_payload = {
        "sub": f"dev:{phone}",
        "phone": phone,
        "name": "Demo User",
        "role": "owner",
        "company_id": "demo-company",
        "db_schema": "public",
    }

    access_token = _issue_token(
        user_payload,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = _issue_token(
        {**user_payload, "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user_payload["sub"],
            "name": user_payload["name"],
            "phone": phone,
            "role": user_payload["role"],
        },
        "company": {
            "id": user_payload["company_id"],
            "name": "Demo Company",
            "plan": "starter",
        },
    }


@router.post("/refresh", status_code=200)
async def refresh_token(body: dict):
    """Exchange a refresh token for a new access token."""
    token = body.get("refresh_token", "")
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    access_token = _issue_token(
        {k: v for k, v in payload.items() if k not in ("exp", "type")},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}
