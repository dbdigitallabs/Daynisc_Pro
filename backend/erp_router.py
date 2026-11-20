"""
ERP Sync Router (TallyPrime)
Connection test, single voucher sync, bulk sync.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser
from tally_connector import TallyConnector
from odoo_connector import OdooConnector
from config import settings

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


async def _get_voucher(db: AsyncSession, voucher_id: str, schema: str) -> dict | None:
    await _set_schema(db, schema)
    try:
        res = await db.execute(text("""
            SELECT v.id, v.voucher_number, v.voucher_type::text, v.voucher_date,
                   p.name        AS party_name,
                   p.gstin       AS party_gstin,
                   v.reference_number,
                   v.subtotal, v.total_cgst, v.total_sgst, v.total_igst, v.total,
                   v.line_items,
                   v.narration, v.tally_synced
            FROM accounting_vouchers v
            LEFT JOIN parties p ON p.id = v.party_id
            WHERE v.id = :id AND NOT v.is_cancelled
        """), {"id": voucher_id})
        row = res.fetchone()
        return dict(row._mapping) if row else None
    except Exception:
        await db.rollback()
        return None


async def _get_line_items(db: AsyncSession, voucher_id: str) -> list[dict]:
    """Get line items from the JSONB column in accounting_vouchers."""
    try:
        res = await db.execute(
            text("SELECT line_items FROM accounting_vouchers WHERE id = :id"),
            {"id": voucher_id}
        )
        row = res.fetchone()
        if not row:
            return []
        items = row[0]
        if isinstance(items, str):
            import json
            items = json.loads(items)
        return items or []
    except Exception:
        await db.rollback()
        return []


async def _mark_synced(db: AsyncSession, voucher_id: str, error: str | None = None):
    try:
        if error:
            # Store error in narration since tally_error column doesn't exist
            await db.execute(text("""
                UPDATE accounting_vouchers
                SET tally_synced = false,
                    narration = CONCAT(COALESCE(narration,''), ' [TALLY ERROR: ', :err, ']')
                WHERE id = :id
            """), {"id": voucher_id, "err": error[:200]})
        else:
            await db.execute(text("""
                UPDATE accounting_vouchers
                SET tally_synced = true, tally_sync_at = NOW()
                WHERE id = :id
            """), {"id": voucher_id})
        await db.commit()
    except Exception:
        await db.rollback()


async def _mark_odoo_synced(db: AsyncSession, voucher_id: str, odoo_ref: str | None = None, error: str | None = None):
    try:
        if error:
            await db.execute(text("""
                UPDATE accounting_vouchers
                SET narration = CONCAT(COALESCE(narration,''), ' [ODOO ERROR: ', :err, ']')
                WHERE id = :id
            """), {"id": voucher_id, "err": error[:200]})
        else:
            ref_tag = f" [ODOO SYNCED: {odoo_ref}]" if odoo_ref else " [ODOO SYNCED]"
            await db.execute(text("""
                UPDATE accounting_vouchers
                SET narration = CONCAT(COALESCE(narration,''), :tag)
                WHERE id = :id
            """), {"id": voucher_id, "tag": ref_tag})
        await db.commit()
    except Exception:
        await db.rollback()


# ── Connection Test ───────────────────────────────────────────────────────────

@router.get("/connection/test/tally")
async def test_tally_connection(
    user: CurrentUser = Depends(get_current_user),
):
    """Test connectivity with TallyPrime HTTP server."""
    connector = TallyConnector()
    result = await connector.test_connection()
    return result


# ── Single Voucher Sync ───────────────────────────────────────────────────────

@router.post("/sync/voucher/{voucher_id}")
async def sync_voucher_to_tally(
    voucher_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Push a single accounting voucher to TallyPrime."""
    voucher = await _get_voucher(db, voucher_id, user.db_schema)
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    if voucher["tally_synced"]:
        return {"success": True, "message": "Already synced"}

    line_items = await _get_line_items(db, voucher_id)

    payload = {
        "voucher_date": str(voucher["voucher_date"]),
        "reference_number": voucher["reference_number"] or voucher["voucher_number"],
        "party_name": voucher["party_name"] or "",
        "narration": voucher["narration"] or "",
        "total": float(voucher["total"] or 0),
        "line_items": [
            {
                "item_name": item.get("item_name", ""),
                "quantity": float(item.get("qty") or item.get("quantity") or 0),
                "rate": float(item.get("rate") or 0),
                "gst_rate": float(item.get("gst_rate") or 0),
                "taxable_amount": float(item.get("taxable") or item.get("taxable_amount") or 0),
                "cgst": float(item.get("cgst") or 0),
                "sgst": float(item.get("sgst") or 0),
                "igst": float(item.get("igst") or 0),
            }
            for item in line_items
        ],
    }

    connector = TallyConnector()
    try:
        vtype = voucher["voucher_type"]
        if vtype == "purchase":
            result = await connector.push_purchase_voucher(payload)
        elif vtype == "sales":
            result = await connector.push_sales_voucher(payload)
        elif vtype == "payment":
            result = await connector.push_payment_voucher(payload)
        elif vtype == "receipt":
            result = await connector.push_receipt_voucher(payload)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported voucher type: {vtype}")

        await _mark_synced(db, voucher_id)
        return {"success": True, "tally_response": result}

    except Exception as e:
        await _mark_synced(db, voucher_id, error=str(e))
        raise HTTPException(status_code=502, detail=f"Tally sync failed: {str(e)}")


# ── Bulk Sync ─────────────────────────────────────────────────────────────────

@router.post("/sync/bulk")
async def bulk_sync_to_tally(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Push all unsynced vouchers (last 30 days) to TallyPrime."""
    await _set_schema(db, user.db_schema)

    pending = await _rows(db, """
        SELECT id, voucher_type FROM accounting_vouchers
        WHERE tally_synced = false AND NOT is_cancelled
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY voucher_date ASC
        LIMIT 100
    """)

    synced = 0
    failed = 0
    errors = []

    connector = TallyConnector()

    for row in pending:
        voucher_id = row["id"]
        vtype = row["voucher_type"]
        try:
            voucher = await _get_voucher(db, voucher_id, user.db_schema)
            if not voucher:
                failed += 1
                continue

            line_items = await _get_line_items(db, voucher_id)
            payload = {
                "voucher_date": str(voucher["voucher_date"]),
                "reference_number": voucher["reference_number"] or voucher["voucher_number"],
                "party_name": voucher["party_name"] or "",
                "narration": voucher["narration"] or "",
                "total": float(voucher["total"] or 0),
                "line_items": [
                    {
                        "item_name": item.get("item_name", ""),
                        "quantity": float(item.get("qty") or item.get("quantity") or 0),
                        "rate": float(item.get("rate") or 0),
                        "gst_rate": float(item.get("gst_rate") or 0),
                        "taxable_amount": float(item.get("taxable") or item.get("taxable_amount") or 0),
                        "cgst": float(item.get("cgst") or 0),
                        "sgst": float(item.get("sgst") or 0),
                        "igst": float(item.get("igst") or 0),
                    }
                    for item in line_items
                ],
            }

            if vtype == "purchase":
                await connector.push_purchase_voucher(payload)
            elif vtype == "sales":
                await connector.push_sales_voucher(payload)
            elif vtype == "payment":
                await connector.push_payment_voucher(payload)
            elif vtype == "receipt":
                await connector.push_receipt_voucher(payload)
            else:
                failed += 1
                continue

            await _mark_synced(db, voucher_id)
            synced += 1

        except Exception as e:
            await _mark_synced(db, voucher_id, error=str(e))
            failed += 1
            errors.append({"id": voucher_id, "error": str(e)[:200]})

    return {
        "total": len(pending),
        "synced": synced,
        "failed": failed,
        "errors": errors[:5],
    }


# ── GST Summary (also used via /gst/summary route) ───────────────────────────

@router.get("/status")
async def erp_sync_status(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Get overall Tally sync status."""
    await _set_schema(db, user.db_schema)

    try:
        res = await db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE NOT tally_synced AND NOT is_cancelled) AS pending,
                COUNT(*) FILTER (WHERE tally_synced) AS synced,
                COUNT(*) FILTER (WHERE tally_error IS NOT NULL) AS errors
            FROM accounting_vouchers
            WHERE created_at >= NOW() - INTERVAL '30 days'
        """))
        row = res.fetchone()
        stats = dict(row._mapping) if row else {"pending": 0, "synced": 0, "errors": 0}
    except Exception:
        await db.rollback()
        stats = {"pending": 0, "synced": 0, "errors": 0}

    return stats


# ── Odoo ERP Routes ───────────────────────────────────────────────────────────

@router.get("/connection/test/odoo")
@router.post("/connection/test/odoo")
async def test_odoo_connection(body: dict | None = None):
    """Test connectivity and authentication with Odoo ERP."""
    creds = body or {}
    url = creds.get("odoo_url") or getattr(settings, "ODOO_URL", "http://localhost:8069")
    db = creds.get("odoo_db") or getattr(settings, "ODOO_DB", "")
    username = creds.get("odoo_username") or getattr(settings, "ODOO_USERNAME", "")
    password = creds.get("odoo_password") or getattr(settings, "ODOO_PASSWORD", "")

    connector = OdooConnector(url=url, db=db, username=username, password=password)
    return connector.test_connection()


@router.post("/sync/odoo/{voucher_id}")
async def sync_voucher_to_odoo(
    voucher_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Push a single accounting voucher to Odoo ERP."""
    voucher = await _get_voucher(db, voucher_id, user.db_schema)
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    line_items = await _get_line_items(db, voucher_id)

    url = getattr(settings, "ODOO_URL", "http://localhost:8069")
    odoo_db = getattr(settings, "ODOO_DB", "")
    username = getattr(settings, "ODOO_USERNAME", "")
    password = getattr(settings, "ODOO_PASSWORD", "")

    connector = OdooConnector(url=url, db=odoo_db, username=username, password=password)
    conn = connector.test_connection()
    if not conn.get("connected") or not conn.get("authenticated"):
        raise HTTPException(status_code=502, detail="Cannot connect to Odoo. Check credentials in Settings.")

    payload = {
        "voucher_number": voucher.get("voucher_number", ""),
        "reference_number": voucher.get("reference_number") or voucher.get("voucher_number", ""),
        "voucher_date": str(voucher.get("voucher_date", "")),
        "party_name": voucher.get("party_name", "Valued Partner"),
        "party_gstin": voucher.get("party_gstin", ""),
        "narration": voucher.get("narration", ""),
        "total": float(voucher.get("total") or 0),
        "subtotal": float(voucher.get("subtotal") or voucher.get("total") or 0),
        "line_items": [
            {
                "name": item.get("item_name") or item.get("name") or "General Item",
                "quantity": float(item.get("qty") or item.get("quantity") or 1.0),
                "rate": float(item.get("rate") or 0),
            }
            for item in line_items
        ],
    }

    try:
        res = connector.sync_voucher(payload, voucher.get("voucher_type"))
        await _mark_odoo_synced(db, voucher_id, odoo_ref=res.get("odoo_ref"))
        return {
            "success": True,
            "odoo_response": res,
            "message": f"Voucher {voucher.get('voucher_number')} synced to Odoo ({res.get('odoo_ref')})!"
        }
    except Exception as e:
        await _mark_odoo_synced(db, voucher_id, error=str(e))
        raise HTTPException(status_code=502, detail=f"Odoo sync failed: {str(e)}")


@router.post("/sync/odoo/bulk")
async def bulk_sync_to_odoo(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Push pending accounting vouchers to Odoo ERP."""
    await _set_schema(db, user.db_schema)

    pending = await _rows(db, """
        SELECT id, voucher_type FROM accounting_vouchers
        WHERE NOT is_cancelled
          AND (narration IS NULL OR narration NOT LIKE '%[ODOO SYNCED%')
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY voucher_date ASC
        LIMIT 100
    """)

    synced = 0
    failed = 0
    errors = []

    url = getattr(settings, "ODOO_URL", "http://localhost:8069")
    odoo_db = getattr(settings, "ODOO_DB", "")
    username = getattr(settings, "ODOO_USERNAME", "")
    password = getattr(settings, "ODOO_PASSWORD", "")

    connector = OdooConnector(url=url, db=odoo_db, username=username, password=password)
    conn = connector.test_connection()
    if not conn.get("connected") or not conn.get("authenticated"):
        raise HTTPException(status_code=502, detail="Cannot connect to Odoo. Check credentials in Settings.")

    for row in pending:
        voucher_id = row["id"]
        try:
            voucher = await _get_voucher(db, voucher_id, user.db_schema)
            if not voucher:
                failed += 1
                continue

            line_items = await _get_line_items(db, voucher_id)
            payload = {
                "voucher_number": voucher.get("voucher_number", ""),
                "reference_number": voucher.get("reference_number") or voucher.get("voucher_number", ""),
                "voucher_date": str(voucher.get("voucher_date", "")),
                "party_name": voucher.get("party_name", "Valued Partner"),
                "party_gstin": voucher.get("party_gstin", ""),
                "narration": voucher.get("narration", ""),
                "total": float(voucher.get("total") or 0),
                "subtotal": float(voucher.get("subtotal") or voucher.get("total") or 0),
                "line_items": [
                    {
                        "name": item.get("item_name") or item.get("name") or "General Item",
                        "quantity": float(item.get("qty") or item.get("quantity") or 1.0),
                        "rate": float(item.get("rate") or 0),
                    }
                    for item in line_items
                ],
            }

            res = connector.sync_voucher(payload, voucher.get("voucher_type"))
            await _mark_odoo_synced(db, voucher_id, odoo_ref=res.get("odoo_ref"))
            synced += 1
        except Exception as e:
            await _mark_odoo_synced(db, voucher_id, error=str(e))
            failed += 1
            errors.append({"id": voucher_id, "error": str(e)[:200]})

    return {
        "success": True,
        "synced": synced,
        "failed": failed,
        "total": len(pending),
        "errors": errors[:5],
        "message": f"Odoo sync completed. Synced: {synced}, Failed: {failed}",
    }
