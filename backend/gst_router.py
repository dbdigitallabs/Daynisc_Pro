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


# ── GST Intelligence & ITC Reconciliation ────────────────────────────────────

from pydantic import BaseModel
from typing import List, Optional

class GSTR2BItem(BaseModel):
    gstin: str
    invoice_number: str
    invoice_date: str
    taxable_amount: float
    cgst: float = 0.0
    sgst: float = 0.0
    igst: float = 0.0
    total: float = 0.0

class ReconcileGSTPayload(BaseModel):
    items: List[GSTR2BItem]

@router.post("/reconcile")
async def reconcile_gstr2b(
    payload: ReconcileGSTPayload,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Compare GSTR-2B portal records with local purchase vouchers in accounting_vouchers.
    Flags matched, mismatched, missing in books, and missing in portal.
    """
    await _set_schema(db, user.db_schema)
    
    # 1. Fetch purchase vouchers from ledger (last 90 days)
    vouchers_res = await db.execute(text("""
        SELECT av.id, av.voucher_number, av.voucher_date::text, av.total,
               av.subtotal, av.total_cgst, av.total_sgst, av.total_igst,
               p.gstin as party_gstin, p.name as party_name
        FROM accounting_vouchers av
        LEFT JOIN parties p ON p.id = av.party_id
        WHERE av.voucher_type = 'purchase'
          AND NOT av.is_cancelled
          AND av.voucher_date >= CURRENT_DATE - INTERVAL '90 days'
    """))
    vouchers = [dict(v._mapping) for v in vouchers_res.fetchall()]
    
    matched = []
    mismatched = []
    missing_in_portal = []
    missing_in_books = []
    
    # Keep track of matched voucher IDs to find missing in portal later
    matched_voucher_ids = set()
    
    # Process GSTR-2B portal items
    for portal_item in payload.items:
        # Standardize inputs
        p_gstin = portal_item.gstin.strip().upper()
        p_inv_num = portal_item.invoice_number.strip().lower()
        p_total = portal_item.total
        
        # Try to find voucher in books with matching invoice/reference number or GSTIN
        found_voucher = None
        for v in vouchers:
            v_ref = (v["reference_number"] or v["voucher_number"] or "").strip().lower()
            v_gstin = (v["party_gstin"] or "").strip().upper()
            
            # Match by reference number or voucher number
            if v_ref == p_inv_num or p_inv_num in v_ref or v_ref in p_inv_num:
                # Prioritize match where GSTIN is also matching
                if not v_gstin or v_gstin == p_gstin:
                    found_voucher = v
                    break
                found_voucher = v
                
        if found_voucher:
            matched_voucher_ids.add(found_voucher["id"])
            v_total = float(found_voucher["total"] or 0)
            
            diff = abs(v_total - p_total)
            itc_eligible = "yes"
            
            # Check GSTIN mismatch
            gstin_mismatch = (found_voucher["party_gstin"] or "").strip().upper() != p_gstin
            
            # Classification
            if diff < 1.5 and not gstin_mismatch:
                matched.append({
                    "portal_item": portal_item.dict(),
                    "books_item": found_voucher,
                    "difference": round(diff, 2),
                    "itc_eligible": itc_eligible
                })
            else:
                mismatched.append({
                    "portal_item": portal_item.dict(),
                    "books_item": found_voucher,
                    "difference": round(diff, 2),
                    "gstin_mismatch": gstin_mismatch,
                    "itc_eligible": "no" if gstin_mismatch else "conditional"
                })
        else:
            missing_in_books.append({
                "portal_item": portal_item.dict(),
                "itc_eligible": "pending_books_entry"
            })
            
    # Locate vouchers in books that are not in portal GSTR-2B
    for v in vouchers:
        if v["id"] not in matched_voucher_ids:
            missing_in_portal.append({
                "books_item": v,
                "itc_eligible": "no_portal_filing"
            })
            
    return {
        "summary": {
            "total_portal_records": len(payload.items),
            "matched_count": len(matched),
            "mismatched_count": len(mismatched),
            "missing_in_books_count": len(missing_in_books),
            "missing_in_portal_count": len(missing_in_portal),
        },
        "matched": matched,
        "mismatched": mismatched,
        "missing_in_books": missing_in_books,
        "missing_in_portal": missing_in_portal
    }

