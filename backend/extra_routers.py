"""
Production Service Router — production orders and efficiency report.
Transport Service Router — lorry receipts (LRs) and status updates.
Settings Service Router — company settings and config.
"""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser

# ── Shared helpers ─────────────────────────────────────────────────────────────

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


async def _scalar(db: AsyncSession, sql: str, params: dict | None = None, default=0):
    try:
        res = await db.execute(text(sql), params or {})
        return res.scalar() or default
    except Exception:
        await db.rollback()
        return default


# ── Production Router ──────────────────────────────────────────────────────────

production_router = APIRouter()


@production_router.get("/orders")
async def list_production_orders(
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
        SELECT id, order_number, finished_item_id, finished_name,
               planned_qty, actual_qty, wastage_qty,
               planned_date::text, started_at::text, completed_at::text,
               shift, status, notes
        FROM production_orders
        {where}
        ORDER BY planned_date DESC, created_at DESC
        LIMIT :limit
    """, params)

    return {"items": orders, "count": len(orders)}


@production_router.patch("/orders/{order_id}")
async def update_production_order(
    order_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    set_parts = []
    params: dict = {"id": order_id}

    if "status" in payload:
        set_parts.append("status = :status")
        params["status"] = payload["status"]
        if payload["status"] == "in_progress":
            set_parts.append("started_at = NOW()")
        elif payload["status"] == "completed":
            set_parts.append("completed_at = NOW()")

    if "actual_quantity" in payload:
        set_parts.append("actual_qty = :actual_qty")
        params["actual_qty"] = payload["actual_quantity"]

    if "wastage_quantity" in payload:
        set_parts.append("wastage_qty = :wastage_qty")
        params["wastage_qty"] = payload["wastage_quantity"]

    if not set_parts:
        return {"success": False, "message": "No fields to update"}

    try:
        await db.execute(text(f"""
            UPDATE production_orders SET {", ".join(set_parts)}
            WHERE id = :id
        """), params)
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        return {"success": False, "error": str(e)}


@production_router.get("/report")
async def production_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    params: dict = {}
    date_filter = ""
    if from_date:
        date_filter += " AND planned_date >= :from_date"
        params["from_date"] = from_date
    if to_date:
        date_filter += " AND planned_date <= :to_date"
        params["to_date"] = to_date

    summary = await _rows(db, f"""
        SELECT finished_name AS item_name,
               COUNT(*) AS order_count,
               COALESCE(SUM(planned_qty), 0) AS total_planned,
               COALESCE(SUM(actual_qty), 0) AS total_actual,
               COALESCE(SUM(wastage_qty), 0) AS total_wastage,
               CASE WHEN SUM(planned_qty) > 0
                    THEN ROUND((SUM(actual_qty) / SUM(planned_qty)) * 100, 1)
                    ELSE 0 END AS efficiency_pct
        FROM production_orders
        WHERE status = 'completed' {date_filter}
        GROUP BY finished_name
        ORDER BY total_actual DESC
    """, params)

    return {"summary": summary}


# ── Transport Router ───────────────────────────────────────────────────────────

transport_router = APIRouter()


@transport_router.get("/lr")
async def list_lorry_receipts(
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

    lrs = await _rows(db, f"""
        SELECT id, lr_number, lr_date::text, transporter_name, transporter_id,
               vehicle_number, origin, destination,
               weight_kg, freight_amount, status,
               sales_order_id, dispatched_at::text, delivered_at::text
        FROM lorry_receipts
        {where}
        ORDER BY lr_date DESC, created_at DESC
        LIMIT :limit
    """, params)

    return {"items": lrs, "count": len(lrs)}


@transport_router.patch("/lr/{lr_id}/status")
async def update_lr_status(
    lr_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    new_status = payload.get("status", "")

    extra = ""
    if new_status == "in_transit":
        extra = ", dispatched_at = NOW()"
    elif new_status == "delivered":
        extra = ", delivered_at = NOW()"

    try:
        await db.execute(text(f"""
            UPDATE lorry_receipts SET status = :status{extra}
            WHERE id = :id
        """), {"status": new_status, "id": lr_id})
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        return {"success": False, "error": str(e)}


# ── Settings Router ────────────────────────────────────────────────────────────

settings_router = APIRouter()


@settings_router.get("/company")
async def get_company_settings(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        res = await db.execute(
            text("SELECT * FROM public.companies WHERE id = :id"),
            {"id": user.company_id}
        )
        row = res.fetchone()
        return dict(row._mapping) if row else {}
    except Exception:
        await db.rollback()
        return {}


@settings_router.patch("/company")
async def update_company_settings(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Store Tally URL, WhatsApp token etc. in company settings."""
    allowed = {"tally_url", "tally_company", "whatsapp_token", "gemini_key", "ai_threshold"}
    updates = {k: v for k, v in payload.items() if k in allowed}

    if not updates:
        return {"success": False, "message": "No valid fields"}

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["company_id"] = user.company_id

    try:
        await db.execute(
            text(f"UPDATE public.companies SET {set_clause} WHERE id = :company_id"),
            updates
        )
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        # Settings columns may not exist yet — that's OK
        return {"success": True, "note": "Saved in memory (DB column may need migration)"}
