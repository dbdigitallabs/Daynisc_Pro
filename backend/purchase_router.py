"""
Purchase Service Router
Purchase orders and bills.
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


@router.get("/orders")
async def list_purchase_orders(
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
        SELECT id, order_number, supplier_name, supplier_id,
               order_date::text, expected_date::text, reference_number,
               subtotal, total, status, notes,
               created_at::text
        FROM purchase_orders
        {where}
        ORDER BY order_date DESC, created_at DESC
        LIMIT :limit
    """, params)

    return {"items": orders, "count": len(orders)}


@router.get("/bills")
async def list_purchase_bills(
    limit: int = Query(50, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    bills = await _rows(db, """
        SELECT id, voucher_number, voucher_date::text,
               party_name, party_gstin, reference_number,
               subtotal, total_cgst, total_sgst, total_igst, total,
               tally_synced, created_at::text
        FROM accounting_vouchers
        WHERE voucher_type = 'purchase' AND NOT is_cancelled
        ORDER BY voucher_date DESC
        LIMIT :limit
    """, {"limit": limit})

    return {"items": bills, "count": len(bills)}
