"""
GST Compliance Router
GSTR-1, GSTR-2, summary, e-invoice status.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
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


async def _scalar(db: AsyncSession, sql: str, params: dict | None = None, default=0):
    try:
        res = await db.execute(text(sql), params or {})
        return res.scalar() or default
    except Exception:
        await db.rollback()
        return default


async def _rows(db: AsyncSession, sql: str, params: dict | None = None) -> list[dict]:
    try:
        res = await db.execute(text(sql), params or {})
        return [dict(r._mapping) for r in res.fetchall()]
    except Exception:
        await db.rollback()
        return []


@router.get("/summary")
async def get_gst_summary(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Aggregate GST figures from accounting vouchers for current month."""
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

    einvoice_count = int(await _scalar(db, """
        SELECT COUNT(*) FROM accounting_vouchers
        WHERE voucher_type = 'sales' AND NOT is_cancelled
          AND irn IS NOT NULL
          AND voucher_date >= date_trunc('month', CURRENT_DATE)
    """))

    # Monthly breakdown — last 6 months
    monthly = await _rows(db, """
        SELECT
            TO_CHAR(date_trunc('month', voucher_date), 'Mon YYYY') AS month,
            date_trunc('month', voucher_date) AS month_start,
            COALESCE(SUM(CASE WHEN voucher_type='sales'
                THEN total_cgst + total_sgst + total_igst ELSE 0 END), 0) AS output,
            COALESCE(SUM(CASE WHEN voucher_type='purchase'
                THEN total_cgst + total_sgst + total_igst ELSE 0 END), 0) AS input,
            COALESCE(
                SUM(CASE WHEN voucher_type='sales'
                    THEN total_cgst + total_sgst + total_igst ELSE 0 END)
              - SUM(CASE WHEN voucher_type='purchase'
                    THEN total_cgst + total_sgst + total_igst ELSE 0 END),
            0) AS net,
            false AS filed
        FROM accounting_vouchers
        WHERE NOT is_cancelled
          AND voucher_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY date_trunc('month', voucher_date)
        ORDER BY date_trunc('month', voucher_date) ASC
    """)

    # Strip the internal month_start from output
    cleaned_monthly = [
        {k: v for k, v in row.items() if k != "month_start"}
        for row in monthly
    ]

    return {
        "output_gst": output_gst,
        "input_gst": input_gst,
        "net_liability": round(output_gst - input_gst, 2),
        "total_invoices": total_invoices,
        "einvoice_count": einvoice_count,
        "pending_filing": 1 if output_gst > 0 else 0,
        "monthly": cleaned_monthly,
    }
