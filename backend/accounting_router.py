"""
Accounting Service Router
Handles vouchers, outstanding summary, and ledger.
"""
from __future__ import annotations
from datetime import date
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


async def _scalar(db: AsyncSession, sql: str, params: dict | None = None, default=0):
    try:
        res = await db.execute(text(sql), params or {})
        return res.scalar() or default
    except Exception:
        await db.rollback()
        return default


# ── Vouchers ──────────────────────────────────────────────────────────────────

@router.get("/vouchers")
async def list_vouchers(
    voucher_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    tally_synced: Optional[bool] = None,
    limit: int = Query(50, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    conditions = ["NOT av.is_cancelled"]
    params: dict = {"limit": limit}

    if voucher_type:
        conditions.append("av.voucher_type = CAST(:voucher_type AS voucher_type_enum)")
        params["voucher_type"] = voucher_type
    if from_date:
        conditions.append("av.voucher_date >= :from_date")
        params["from_date"] = from_date
    if to_date:
        conditions.append("av.voucher_date <= :to_date")
        params["to_date"] = to_date
    if tally_synced is not None:
        conditions.append("av.tally_synced = :tally_synced")
        params["tally_synced"] = tally_synced


    where = " AND ".join(conditions)
    rows = await _rows(db, f"""
        SELECT av.id, av.voucher_number, av.voucher_type::text, av.voucher_date::text,
               p.name       AS party_name,
               p.gstin      AS party_gstin,
               av.reference_number,
               av.subtotal, av.total_cgst, av.total_sgst, av.total_igst, av.total,
               av.tally_synced, av.narration,
               av.created_at::text
        FROM accounting_vouchers av
        LEFT JOIN parties p ON p.id = av.party_id
        WHERE {where}
        ORDER BY av.voucher_date DESC, av.created_at DESC
        LIMIT :limit
    """, params)


    return {"items": rows, "count": len(rows)}


# ── Outstanding Summary ───────────────────────────────────────────────────────

@router.get("/outstanding")
async def get_outstanding(
    party_type: str = "customer",
    limit: int = Query(50, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    amount_col = "receivable" if party_type == "customer" else "payable"
    items = await _rows(db, f"""
        SELECT party_id, party_name, party_type, phone,
               invoice_count, receivable, payable,
               aging_bucket, days_overdue, credit_days
        FROM outstanding_summary
        WHERE party_type IN (:party_type, 'both')
          AND {amount_col} > 0
        ORDER BY {amount_col} DESC
        LIMIT :limit
    """, {"party_type": party_type, "limit": limit})

    return {"items": items, "count": len(items)}


# ── GST Summary (used by GSTPage) ─────────────────────────────────────────────

@router.get("/gst-summary")
async def get_gst_summary(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Aggregate GST figures from accounting_vouchers."""
    await _set_schema(db, user.db_schema)

    output_gst = float(await _scalar(db, """
        SELECT COALESCE(SUM(total_cgst + total_sgst + total_igst), 0)
        FROM accounting_vouchers
        WHERE voucher_type = 'sales' AND NOT is_cancelled
          AND voucher_date >= date_trunc('month', CURRENT_DATE)
    """))

    input_gst = float(await _scalar(db, """
        SELECT COALESCE(SUM(total_cgst + total_sgst + total_igst), 0)
        FROM accounting_vouchers
        WHERE voucher_type = 'purchase' AND NOT is_cancelled
          AND voucher_date >= date_trunc('month', CURRENT_DATE)
    """))

    total_invoices = int(await _scalar(db, """
        SELECT COUNT(*) FROM accounting_vouchers
        WHERE voucher_type = 'sales' AND NOT is_cancelled
          AND voucher_date >= date_trunc('month', CURRENT_DATE)
    """))

    # Monthly breakdown (last 6 months)
    monthly = await _rows(db, """
        SELECT TO_CHAR(voucher_date, 'Mon YYYY') AS month,
               COALESCE(SUM(CASE WHEN voucher_type='sales' THEN total_cgst+total_sgst+total_igst ELSE 0 END), 0) AS output,
               COALESCE(SUM(CASE WHEN voucher_type='purchase' THEN total_cgst+total_sgst+total_igst ELSE 0 END), 0) AS input,
               COALESCE(SUM(CASE WHEN voucher_type='sales' THEN total_cgst+total_sgst+total_igst ELSE 0 END)
                      - SUM(CASE WHEN voucher_type='purchase' THEN total_cgst+total_sgst+total_igst ELSE 0 END), 0) AS net,
               false AS filed
        FROM accounting_vouchers
        WHERE NOT is_cancelled
          AND voucher_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(voucher_date, 'Mon YYYY'), date_trunc('month', voucher_date)
        ORDER BY date_trunc('month', voucher_date)
    """)

    return {
        "output_gst": output_gst,
        "input_gst": input_gst,
        "net_liability": output_gst - input_gst,
        "total_invoices": total_invoices,
        "einvoice_count": 0,
        "pending_filing": 1 if output_gst > 0 else 0,
        "monthly": monthly,
    }
