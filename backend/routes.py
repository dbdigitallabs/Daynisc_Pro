"""
Dashboard Service — Aggregated KPI endpoint for the web and mobile dashboards.
All DB queries are wrapped in try/except so a fresh install (no tables yet)
returns zeros/empty arrays instead of HTTP 500.
"""
from __future__ import annotations
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser

router = APIRouter()


# ── Safe query helpers ────────────────────────────────────────────────────────

async def _scalar(db: AsyncSession, sql: str, params: dict | None = None, default=0):
    """Execute scalar SQL; return `default` if table doesn't exist or any error."""
    try:
        res = await db.execute(text(sql), params or {})
        return res.scalar() or default
    except Exception:
        await db.rollback()
        return default


async def _rows(db: AsyncSession, sql: str, params: dict | None = None) -> list[dict]:
    """Execute rows SQL; return [] on any error."""
    try:
        res = await db.execute(text(sql), params or {})
        return [dict(r._mapping) for r in res.fetchall()]
    except Exception:
        await db.rollback()
        return []


# ── Dashboard endpoint ────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Return aggregated KPIs, trends, pending actions and low-stock items."""
    try:
        await db.execute(text(f"SET search_path TO {user.db_schema}, public"))
    except Exception:
        pass

    today = date.today()
    month_start = today - timedelta(days=30)

    # ── KPIs ──────────────────────────────────────────────────────────────────
    today_sales = float(await _scalar(db, """
        SELECT COALESCE(SUM(total), 0) FROM accounting_vouchers
        WHERE voucher_type = 'sales' AND voucher_date = :today AND NOT is_cancelled
    """, {"today": today}))

    today_purchases = float(await _scalar(db, """
        SELECT COALESCE(SUM(total), 0) FROM accounting_vouchers
        WHERE voucher_type = 'purchase' AND voucher_date = :today AND NOT is_cancelled
    """, {"today": today}))

    outstanding_receivable = float(await _scalar(db, """
        SELECT COALESCE(SUM(receivable), 0) FROM outstanding_summary
        WHERE party_type IN ('customer', 'both') AND receivable > 0
    """))

    outstanding_payable = float(await _scalar(db, """
        SELECT COALESCE(SUM(payable), 0) FROM outstanding_summary
        WHERE party_type IN ('supplier', 'both') AND payable > 0
    """))

    stock_value = float(await _scalar(db, """
        SELECT COALESCE(SUM(total_value), 0) FROM stock_balance WHERE quantity > 0
    """))

    pending_ai = int(await _scalar(db, """
        SELECT COUNT(*) FROM document_extractions WHERE status IN ('extracted', 'pending')
    """))

    tally_unsynced = int(await _scalar(db, """
        SELECT COUNT(*) FROM accounting_vouchers
        WHERE tally_synced = FALSE AND NOT is_cancelled
          AND created_at >= NOW() - INTERVAL '30 days'
    """))

    low_stock_count = int(await _scalar(db, """
        SELECT COUNT(*) FROM (
            SELECT sb.item_id FROM stock_balance sb
            JOIN item_master im ON im.id = sb.item_id
            WHERE sb.quantity < im.reorder_level AND im.reorder_level > 0
            GROUP BY sb.item_id
        ) t
    """))

    # ── Trends ────────────────────────────────────────────────────────────────
    sales_trend = await _rows(db, """
        SELECT voucher_date::text as date, COALESCE(SUM(total), 0) as amount
        FROM accounting_vouchers
        WHERE voucher_type = 'sales' AND voucher_date >= :start AND NOT is_cancelled
        GROUP BY voucher_date ORDER BY voucher_date
    """, {"start": month_start})

    purchase_trend = await _rows(db, """
        SELECT voucher_date::text as date, COALESCE(SUM(total), 0) as amount
        FROM accounting_vouchers
        WHERE voucher_type = 'purchase' AND voucher_date >= :start AND NOT is_cancelled
        GROUP BY voucher_date ORDER BY voucher_date
    """, {"start": month_start})

    # ── Top items by stock value ───────────────────────────────────────────────
    top_items = await _rows(db, """
        SELECT im.item_name as name,
               COALESCE(SUM(sb.quantity), 0) as qty,
               COALESCE(SUM(sb.total_value), 0) as value
        FROM item_master im
        LEFT JOIN stock_balance sb ON sb.item_id = im.id
        WHERE sb.quantity > 0
        GROUP BY im.item_name ORDER BY value DESC LIMIT 6
    """)

    # ── Recent transactions (last 5 vouchers with party name) ─────────────────
    recent_transactions = await _rows(db, """
        SELECT av.id::text, av.voucher_number, av.voucher_type::text,
               av.voucher_date::text, av.total, av.created_at::text,
               p.name as party_name
        FROM accounting_vouchers av
        LEFT JOIN parties p ON p.id = av.party_id
        WHERE NOT av.is_cancelled
        ORDER BY av.created_at DESC
        LIMIT 5
    """)

    # ── Company info ──────────────────────────────────────────────────────────
    co_name, co_plan = "My Company", "starter"
    try:
        co_res = await db.execute(
            text("SELECT name, plan FROM public.companies WHERE id = :id"),
            {"id": user.company_id},
        )
        co = co_res.fetchone()
        if co:
            co_name, co_plan = co.name, co.plan
    except Exception:
        await db.rollback()

    # ── Pending actions list ──────────────────────────────────────────────────
    pending_actions: list[dict] = []
    if pending_ai > 0:
        pending_actions.append({
            "id": "ai_review", "type": "ai_review",
            "title": f"{pending_ai} document{'s' if pending_ai > 1 else ''} awaiting AI verification",
            "subtitle": "Review and approve to create ERP entries",
            "priority": "high" if pending_ai > 5 else "medium",
        })
    if tally_unsynced > 0:
        pending_actions.append({
            "id": "tally_sync", "type": "tally_sync",
            "title": f"{tally_unsynced} voucher{'s' if tally_unsynced > 1 else ''} not synced to Tally",
            "subtitle": "Click to bulk sync pending vouchers",
            "priority": "medium",
        })

    return {
        "company_name": co_name,
        "plan": co_plan,
        "kpis": {
            "today_sales": today_sales,
            "today_purchases": today_purchases,
            "outstanding_receivable": outstanding_receivable,
            "outstanding_payable": outstanding_payable,
            "stock_value": stock_value,
            "pending_ai": pending_ai,
            "tally_unsynced": tally_unsynced,
            "low_stock_count": low_stock_count,
        },
        "sales_trend": sales_trend,
        "purchase_trend": purchase_trend,
        "top_items": top_items,
        "pending_actions": pending_actions,
        "recent_transactions": recent_transactions,
    }
