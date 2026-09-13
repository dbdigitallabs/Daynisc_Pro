"""
Documents Router — Upload, AI extraction, and verification queue.
Handles bill/invoice upload → Gemini Vision extraction → ERP entry creation.
Table: public.document_extractions
"""
from __future__ import annotations
import io
import json
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser
from shared.config import settings
from ai_extractor import ai_extractor

router = APIRouter()

# ── Enum maps ─────────────────────────────────────────────────────────────────

# Map user-facing document_type → DB enum value
DOC_TYPE_MAP = {
    "purchase":        "purchase_bill",
    "sales":           "invoice",
    "invoice":         "invoice",
    "export":          "invoice",
    "export_invoice":  "invoice",
    "expense":         "other",
    "lr":              "lr",
    "challan":         "challan",
    "payment":         "payment_screenshot",
    "eway":            "eway_bill",
    "bank_statement":  "bank_statement",
    "other":           "other",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

import re as _re
_UUID_RE = _re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', _re.I)

def _safe_uuid(val: str | None) -> str | None:
    """Return val if it's a valid UUID, else None (avoids asyncpg UUID parse errors)."""
    if val and _UUID_RE.match(str(val)):
        return val
    return None


def _parse_date(val: str | None):
    """Convert any date string to a Python date object for asyncpg."""
    if not val:
        return date.today()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            from datetime import datetime
            return datetime.strptime(val[:10], fmt).date()
        except Exception:
            continue
    return date.today()



def _pdf_to_image_bytes(pdf_bytes: bytes) -> bytes:
    """Convert first page of PDF to PNG bytes."""
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(pdf_bytes, dpi=200, first_page=1, last_page=1)
        if not images:
            raise ValueError("No pages found in PDF")
        buf = io.BytesIO()
        images[0].save(buf, format="PNG")
        return buf.getvalue()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF conversion failed: {e}")


def _validate_file(content_type: str, size: int):
    allowed = {"application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"}
    if content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. Use PDF, JPG, or PNG."
        )
    if size > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")


# ── Upload Endpoint ───────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(default="purchase"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Upload a bill/invoice (PDF, JPG, PNG) for AI extraction.
    - With Gemini key → full AI extraction of party, items, GST etc.
    - Without Gemini key → document saved, shows setup prompt.
    """
    file_bytes = await file.read()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "upload"

    # Fix content type for PDFs uploaded with wrong MIME
    if filename.lower().endswith(".pdf"):
        content_type = "application/pdf"

    _validate_file(content_type, len(file_bytes))

    # Map to DB enum value
    db_doc_type = DOC_TYPE_MAP.get(document_type, "other")

    # ── Convert PDF to image for Vision API ───────────────────────────────
    if content_type == "application/pdf":
        image_bytes = _pdf_to_image_bytes(file_bytes)
        mime = "image/png"
    else:
        image_bytes = file_bytes
        mime = content_type

    # ── Check Gemini key ──────────────────────────────────────────────────
    gemini_key = ""
    if user.company_id:
        try:
            res = await db.execute(
                text("SELECT gemini_key FROM public.companies WHERE id = :company_id"),
                {"company_id": user.company_id}
            )
            row = res.fetchone()
            if row and row[0]:
                gemini_key = str(row[0]).strip()
        except Exception as e:
            print(f"[DEBUG documents_router] DB key check failed: {e}", flush=True)

    if not gemini_key or gemini_key in ("", "your-gemini-key", "change-me", "None"):
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""

    if not gemini_key or gemini_key in ("", "your-gemini-key", "change-me", "None"):
        # Save record with failed status, clear message
        doc_id = str(uuid.uuid4())
        try:
            await db.execute(text("""
                INSERT INTO document_extractions
                    (id, s3_key, filename, document_type, status,
                     extracted_data, confidence_score, language,
                     uploaded_by, created_at, updated_at)
                VALUES
                    (:id, :s3_key, :filename,
                     CAST(:doc_type AS doc_type_enum),
                     CAST('failed' AS extraction_status_enum),
                     CAST(:data AS jsonb), 0, 'en',
                     :user_id, NOW(), NOW())
            """), {
                "id": doc_id,
                "s3_key": f"local/{doc_id}/{filename}",
                "filename": filename,
                "doc_type": db_doc_type,
                "data": json.dumps({"error": "Gemini API key not configured"}),
                "user_id": _safe_uuid(user.id),
            })
            await db.commit()
        except Exception:
            await db.rollback()

        return {
            "id": doc_id,
            "status": "failed",
            "message": " Gemini API key not configured. Go to Settings → AI Settings → enter your Gemini API key.",
            "setup_url": "/settings",
        }

    # ── Gemini Vision extraction ───────────────────────────────────────────
    extracted = await ai_extractor.extract(
        image_bytes=image_bytes,
        mime_type=mime,
        document_type_hint=document_type,
        api_key=gemini_key,
    )

    has_error = bool(extracted.get("extraction_error"))
    confidence = float(extracted.get("confidence", {}).get("overall", 0.0))
    db_status = "failed" if has_error else "extracted"
    doc_id = str(uuid.uuid4())

    try:
        await db.execute(text("""
            INSERT INTO document_extractions
                (id, s3_key, filename, document_type, status,
                 extracted_data, confidence_score, language,
                 is_duplicate, uploaded_by, created_at, updated_at)
            VALUES
                (:id, :s3_key, :filename,
                 CAST(:doc_type AS doc_type_enum),
                 CAST(:status AS extraction_status_enum),
                 CAST(:data AS jsonb), :confidence, :lang,
                 false, :user_id, NOW(), NOW())
        """), {
            "id": doc_id,
            "s3_key": f"local/{doc_id}/{filename}",
            "filename": filename,
            "doc_type": db_doc_type,
            "status": db_status,
            "data": json.dumps(extracted),
            "confidence": min(confidence, 0.9999),
            "lang": extracted.get("language", "en"),
            "user_id": _safe_uuid(user.id),

        })
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"DB save failed: {e}")

    if has_error:
        return {
            "id": doc_id,
            "status": "failed",
            "error": extracted["extraction_error"],
        }

    return {
        "id": doc_id,
        "status": "extracted",
        "document_type": extracted.get("document_type", document_type),
        "party_name": extracted.get("party_name"),
        "invoice_number": extracted.get("invoice_number"),
        "total_amount": extracted.get("total_amount"),
        "confidence": confidence,
        "message": " AI extraction complete — review in Needs Review tab",
    }


# ── List Documents ────────────────────────────────────────────────────────────

@router.get("")
async def list_documents(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List AI extraction queue items for this user."""
    params: dict = {"limit": limit}
    conditions = []

    if status:
        conditions.append("status = CAST(:status AS extraction_status_enum)")
        params["status"] = status

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    try:
        rows = await db.execute(text(f"""
            SELECT id, document_type::text, filename as original_filename,
                   status::text, confidence_score, language, is_duplicate,
                   extracted_data, created_at::text
            FROM document_extractions
            {where}
            ORDER BY created_at DESC
            LIMIT :limit
        """), params)
        items = []
        for r in rows.fetchall():
            row = dict(r._mapping)
            data = row.get("extracted_data")
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception:
                    data = {}
            row["extracted_data"] = data or {}
            if data and data.get("document_type"):
                row["document_type"] = data.get("document_type")
            items.append(row)
        return {"items": items, "count": len(items)}
    except Exception as e:
        await db.rollback()
        return {"items": [], "count": 0, "error": str(e)}


# ── Verify (Approve / Reject) ─────────────────────────────────────────────────

@router.post("/{doc_id}/verify")
async def verify_document(
    doc_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Approve (→ creates ERP voucher) or reject an AI-extracted document."""
    approve = payload.get("approve", False)
    corrections = payload.get("corrections") or {}

    # Get the extraction record
    try:
        res = await db.execute(text("""
            SELECT extracted_data, document_type::text
            FROM document_extractions WHERE id = :id
        """), {"id": doc_id})
        row = res.fetchone()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=404, detail="Document not found")

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    raw_data = row[0]
    doc_type_raw = row[1]

    data = raw_data if isinstance(raw_data, dict) else {}
    data.update(corrections)

    if not approve:
        try:
            await db.execute(text("""
                UPDATE document_extractions
                SET status = CAST('failed' AS extraction_status_enum), updated_at = NOW(),
                    verified_by = :user_id, verified_at = NOW()
                WHERE id = :id
            """), {"id": doc_id, "user_id": _safe_uuid(user.id)})

            await db.commit()
        except Exception:
            await db.rollback()
        return {"success": True, "status": "rejected"}

    # ── Handle Bank Statement Verification ─────────────────────────────────
    if doc_type_raw == "bank_statement" or data.get("document_type") == "bank_statement":
        approved_transactions = corrections.get("transactions") or data.get("transactions") or []
        created_vouchers = []
        try:
            for tx in approved_transactions:
                if not tx.get("approved"):
                    continue
                
                vtype = tx.get("voucher_type")  # "payment" or "receipt"
                if vtype not in ("payment", "receipt"):
                    continue
                
                party_name = tx.get("party_name") or "Unknown Party"
                party_type = "supplier" if vtype == "payment" else "customer"
                
                # Find or create party
                res = await db.execute(text("""
                    SELECT id FROM parties WHERE LOWER(name) = LOWER(:name) LIMIT 1
                """), {"name": party_name})
                party_row = res.fetchone()

                if party_row:
                    party_id = str(party_row[0])
                else:
                    party_id = str(uuid.uuid4())
                    await db.execute(text("""
                        INSERT INTO parties (id, name, party_type, created_at, updated_at)
                        VALUES (:id, :name, :ptype, NOW(), NOW())
                    """), {
                        "id": party_id,
                        "name": party_name,
                        "ptype": party_type,
                    })
                
                # Generate unique voucher number
                prefix = "PAY" if vtype == "payment" else "REC"
                voucher_num = tx.get("reference_number") or f"{prefix}-BS-{doc_id[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"
                
                # Ensure unique
                dup = await db.execute(text(
                    "SELECT 1 FROM accounting_vouchers WHERE voucher_number = :v"
                ), {"v": voucher_num})
                if dup.fetchone():
                    voucher_num = f"{voucher_num}-{uuid.uuid4().hex[:4].upper()}"
                
                amount = float(tx.get("withdrawal") or tx.get("deposit") or 0)
                
                # Insert accounting voucher
                vid = uuid.uuid4()
                await db.execute(text("""
                    INSERT INTO accounting_vouchers (
                        id, voucher_number, voucher_type, voucher_date,
                        party_id, reference_number,
                        line_items, subtotal, total,
                        narration, tally_synced, is_cancelled,
                        source_extraction, created_by, created_at, updated_at
                    ) VALUES (
                        :id, :vnum, CAST(:vtype AS voucher_type_enum), :vdate,
                        :party_id, :ref,
                        '[]'::jsonb,
                        :subtotal, :total,
                        :narration, false, false,
                        :src, :created_by, NOW(), NOW()
                    )
                """), {
                    "id":         vid,
                    "vnum":       voucher_num,
                    "vtype":      vtype,
                    "vdate":      _parse_date(tx.get("date")),
                    "party_id":   uuid.UUID(party_id),
                    "ref":        tx.get("reference_number"),
                    "subtotal":   amount,
                    "total":      amount,
                    "narration":  f"Bank Statement Entry — {tx.get('description')}",
                    "src":        uuid.UUID(doc_id),
                    "created_by": _safe_uuid(user.id),
                })
                
                created_vouchers.append(str(vid))
                
            # Update extraction status
            await db.execute(text("""
                UPDATE document_extractions
                SET status = CAST('pushed' AS extraction_status_enum),
                    updated_at = NOW(),
                    verified_by = :user_id,
                    verified_at = NOW()
                WHERE id = :id
            """), {"id": doc_id, "user_id": _safe_uuid(user.id)})
            
            await db.commit()
            return {"success": True, "voucher_ids": created_vouchers, "status": "pushed"}
            
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Bank statement entry creation failed: {e}")

    # ── Create accounting voucher ─────────────────────────────────────────
    voucher_id = str(uuid.uuid4())

    # Map document type to voucher type enum
    vtype_map = {
        "invoice": "sales", "purchase_bill": "purchase",
        "purchase": "purchase", "sales": "sales",
        "export_invoice": "sales", "export": "sales",
        "payment_screenshot": "payment", "other": "journal",
        "lr": "journal", "challan": "journal",
    }
    vtype = vtype_map.get(doc_type_raw, "purchase")

    try:
        # ── 1. Find or create the party ───────────────────────────────────
        party_name = (
            data.get("consignee_name")                # export: buyer is the party
            or data.get("party_name")
            or data.get("transporter_name")
            or data.get("bank_reference")
            or "Unknown Party"
        ) if vtype == "sales" else (
            data.get("party_name")
            or data.get("transporter_name")
            or data.get("bank_reference")
            or "Unknown Party"
        )
        party_type = "supplier" if vtype == "purchase" else "customer"

        res = await db.execute(text("""
            SELECT id FROM parties WHERE LOWER(name) = LOWER(:name) LIMIT 1
        """), {"name": party_name})
        party_row = res.fetchone()

        if party_row:
            party_id = str(party_row[0])
        else:
            party_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO parties (id, name, party_type, gstin, created_at, updated_at)
                VALUES (:id, :name, :ptype, :gstin, NOW(), NOW())
            """), {
                "id": party_id,
                "name": party_name,
                "ptype": party_type,
                "gstin": data.get("party_gstin"),
            })

        # ── 2. Build line_items JSONB ─────────────────────────────────────
        line_items_json = json.dumps([
            {
                "item_name": item.get("item_name", "Item"),
                "hsn_code":  item.get("hsn_code"),
                "qty":       float(item.get("quantity") or 1),
                "unit":      item.get("unit", "PCS"),
                "rate":      float(item.get("rate") or 0),
                "gst_rate":  float(item.get("gst_rate") or 0),
                "taxable":   float(item.get("taxable_amount") or 0),
                "cgst":      float(item.get("cgst") or 0),
                "sgst":      float(item.get("sgst") or 0),
                "igst":      float(item.get("igst") or 0),
                "total":     float(item.get("total") or 0),
            }
            for item in data.get("line_items", [])
        ])

        # ── 3. Generate unique voucher number ─────────────────────────────
        prefix = {"purchase": "PUR", "sales": "SAL", "payment": "PAY",
                  "receipt": "REC", "journal": "JNL"}.get(vtype, "VCH")
        voucher_num = data.get("invoice_number") or f"{prefix}-AI-{doc_id[:6].upper()}"

        # Ensure unique — append suffix if duplicate
        dup = await db.execute(text(
            "SELECT 1 FROM accounting_vouchers WHERE voucher_number = :v"
        ), {"v": voucher_num})
        if dup.fetchone():
            voucher_num = f"{voucher_num}-{doc_id[:4].upper()}"

        # Build narration — include export-specific context if available
        _narration_parts = [f"AI-extracted from {doc_type_raw} — {party_name}"]
        if data.get("consignee_name") and doc_type_raw in ("export_invoice", "invoice"):
            _narration_parts.append(f"Consignee: {data['consignee_name']}")
        if data.get("incoterms"):
            _narration_parts.append(f"INCOTERMS: {data['incoterms']}")
        if data.get("currency") and data.get("currency") != "INR":
            _narration_parts.append(f"Currency: {data['currency']}")
        if data.get("advance_licence_no"):
            _narration_parts.append(f"Adv. Licence: {data['advance_licence_no']}")
        _narration = " | ".join(_narration_parts)

        await db.execute(text("""
            INSERT INTO accounting_vouchers (
                id, voucher_number, voucher_type, voucher_date,
                party_id, reference_number,
                line_items, subtotal, total_cgst, total_sgst, total_igst, total,
                narration, tally_synced, is_cancelled,
                source_extraction, created_by, created_at, updated_at
            ) VALUES (
                :id, :vnum, CAST(:vtype AS voucher_type_enum), :vdate,
                :party_id, :ref,
                CAST(:line_items AS jsonb),
                :subtotal, :cgst, :sgst, :igst, :total,
                :narration, false, false,
                :src, :created_by, NOW(), NOW()
            )
        """), {
            "id":         uuid.UUID(voucher_id),

            "vnum":       voucher_num,
            "vtype":      vtype,
            "vdate":      _parse_date(data.get("invoice_date")),
            "party_id":   uuid.UUID(party_id),
            "ref":        data.get("invoice_number"),
            "line_items": line_items_json,
            "subtotal":   float(data.get("subtotal") or 0),
            "cgst":       float(data.get("total_cgst") or 0),
            "sgst":       float(data.get("total_sgst") or 0),
            "igst":       float(data.get("total_igst") or 0),
            "total":      float(data.get("total_amount") or 0),
            "narration":  _narration,
            "src":        uuid.UUID(doc_id),
            "created_by": _safe_uuid(user.id),
        })

        # ── 5. Mark extraction as pushed ──────────────────────────────────
        await db.execute(text("""
            UPDATE document_extractions
            SET status = CAST('pushed' AS extraction_status_enum),
                updated_at = NOW(),
                erp_voucher_id = CAST(:vid AS uuid),
                verified_by = :user_id,
                verified_at = NOW()
            WHERE id = :id
        """), {"id": doc_id, "vid": uuid.UUID(voucher_id), "user_id": _safe_uuid(user.id)})


        await db.commit()
        return {"success": True, "voucher_id": voucher_id, "status": "pushed"}


    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Voucher creation failed: {e}")
