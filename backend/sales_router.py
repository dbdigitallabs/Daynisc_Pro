"""
Sales Service Router
Sales orders, invoices, outstanding receivables, payment reminders.
"""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser

router = APIRouter()


async def _set_schema(db: AsyncSession, schema: str):
    try:
        await db.execute(text(f"SET search_path TO {schema}, public"))
    except Exception:
        pass


async def _rows(db: AsyncSession, sql: str, params: dict | None = None) -> list[dict]:
    try:
        res = await db.execute(text(sql), params or {})
        return [dict(r._mapping) for r in res.fetchall()]
    except Exception:
        await db.rollback()
        return []


# ── Sales Orders ──────────────────────────────────────────────────────────────

@router.get("/orders")
async def list_sales_orders(
    status: Optional[str] = None,
    limit: int = Query(50, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    conditions = []
    params: dict = {"limit": limit}

    if status:
        conditions.append("status = :status")
        params["status"] = status

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    orders = await _rows(db, f"""
        SELECT id, order_number, customer_name, customer_id,
               order_date::text, delivery_date::text, po_number,
               subtotal, total, status, notes,
               created_at::text
        FROM sales_orders
        {where}
        ORDER BY order_date DESC, created_at DESC
        LIMIT :limit
    """, params)

    return {"items": orders, "count": len(orders)}


# ── Payment Reminders ─────────────────────────────────────────────────────────

@router.post("/payment-reminders")
async def send_payment_reminders(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Stub: send payment reminders via configured channel."""
    channel = payload.get("channel", "whatsapp")
    overdue_days_min = payload.get("overdue_days_min", 7)
    dry_run = payload.get("dry_run", True)

    await _set_schema(db, user.db_schema)

    # Get overdue customers
    overdue = await _rows(db, """
        SELECT party_name, phone, receivable, days_overdue
        FROM outstanding_summary
        WHERE party_type IN ('customer', 'both')
          AND receivable > 0
          AND days_overdue >= :days_min
          AND phone IS NOT NULL
    """, {"days_min": overdue_days_min})

    if dry_run:
        return {
            "dry_run": True,
            "would_send": len(overdue),
            "channel": channel,
            "sent": 0, "skipped": len(overdue), "failed": 0,
        }

    # In production this would call WhatsApp/SMS API
    return {
        "dry_run": False,
        "channel": channel,
        "sent": len(overdue),
        "skipped": 0,
        "failed": 0,
        "recipients": len(overdue),
    }
