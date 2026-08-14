"""
Excel Mapper Router
AI-powered column detection for Excel-to-Tally imports and mapping template management.
"""
from __future__ import annotations
import json
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from google import genai
from google.genai import types

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser
from config import settings

router = APIRouter()

# ── Models ────────────────────────────────────────────────────────────────────

class DetectColumnsPayload(BaseModel):
    headers: List[str]

class SaveTemplatePayload(BaseModel):
    template_name: str
    mapping: Dict[str, str]  # standard_key -> excel_header

class ImportRowsPayload(BaseModel):
    mapping: Dict[str, str]
    rows: List[Dict[str, Any]]
    voucher_type: str  # 'sales' | 'purchase'

# ── Gemini Client Setup ────────────────────────────────────────────────────────
def _get_client():
    key = settings.GEMINI_API_KEY
    if not key or key in ("your-gemini-key", "change-me", "None"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please set it in Settings."
        )
    return genai.Client(api_key=key)

# ── Column Detection endpoint ─────────────────────────────────────────────────

@router.post("/detect-columns")
async def detect_excel_columns(
    payload: DetectColumnsPayload
):
    """
    Takes list of headers from an uploaded Excel file and asks Gemini
    to map them to Daynisc AI internal standard columns.
    """
    client = _get_client()
    
    prompt = f"""
You are an expert data migration agent. You map raw Excel column headers from an accounting spreadsheet
to standard target accounting fields.

Source Headers:
{payload.headers}

Target Fields to map to:
- voucher_date (Invoice/Voucher date)
- voucher_number (Invoice/Bill number)
- party_name (Customer/Supplier name)
- party_gstin (GSTIN/GST number)
- item_name (Product/Service/Stock item name)
- quantity (Qty)
- rate (Unit Price/Rate)
- HSN (HSN Code)
- subtotal (Taxable Amount)
- cgst (CGST Amount)
- sgst (SGST Amount)
- igst (IGST Amount)
- total (Total Invoice Amount)
- narration (Remarks/Notes)

Map each standard target field to its closest matching source header.
If a target field does not seem to have any close match in the source headers, map it to null.
Respond ONLY with a valid JSON object mapping standard target field names to source headers.
Example:
{{
  "voucher_date": "Bill Date",
  "voucher_number": "Inv No.",
  "party_name": "Supplier",
  ...
}}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Part.from_text(text=prompt)]
        )
        text_resp = response.text or ""
        # Clean JSON markdown fences
        if "```json" in text_resp:
            text_resp = text_resp.split("```json")[1].split("```")[0].strip()
        elif "```" in text_resp:
            text_resp = text_resp.split("```")[1].split("```")[0].strip()
        
        mapping = json.loads(text_resp)
        return {"mapping": mapping}
    except Exception as e:
        # Fallback to basic keyword matching if API fails
        fallback_map = {}
        header_lower = {h.lower(): h for h in payload.headers}
        
        rules = {
            "voucher_date": ["date", "bill date", "invoice date", "dt"],
            "voucher_number": ["invoice number", "invoice no", "inv no", "bill no", "voucher no", "number"],
            "party_name": ["party name", "customer", "supplier", "vendor", "party", "name", "client"],
            "party_gstin": ["gstin", "gst no", "gst", "tin"],
            "item_name": ["item name", "product name", "item", "product", "description"],
            "quantity": ["qty", "quantity", "quantity_pcs", "nos"],
            "rate": ["rate", "price", "unit price"],
            "subtotal": ["taxable amount", "taxable", "subtotal", "sub total"],
            "cgst": ["cgst"],
            "sgst": ["sgst"],
            "igst": ["igst"],
            "total": ["total", "total amount", "grand total", "net amount"],
        }
        
        for target, keywords in rules.items():
            fallback_map[target] = None
            for kw in keywords:
                for hl, orig in header_lower.items():
                    if kw in hl:
                        fallback_map[target] = orig
                        break
                if fallback_map[target]:
                    break
        return {"mapping": fallback_map, "warning": f"AI mapping failed: {e}. Used keyword heuristic."}

# ── Save Template Configuration ───────────────────────────────────────────────

@router.post("/template")
async def save_mapping_template(
    payload: SaveTemplatePayload,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """Saves a mapping template to the company's config."""
    res = await db.execute(
        text("SELECT tally_config FROM public.companies WHERE id = :company_id"),
        {"company_id": user.company_id}
    )
    row = res.fetchone()
    tally_config = row[0] if row and row[0] else {}
    if not isinstance(tally_config, dict):
        tally_config = {}
        
    templates = tally_config.get("mapping_templates", {})
    templates[payload.template_name] = payload.mapping
    tally_config["mapping_templates"] = templates
    
    await db.execute(
        text("UPDATE public.companies SET tally_config = :conf WHERE id = :company_id"),
        {"conf": json.dumps(tally_config), "company_id": user.company_id}
    )
    await db.commit()
    return {"success": True, "message": f"Template '{payload.template_name}' saved successfully."}

@router.get("/templates")
async def list_mapping_templates(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """List all saved column mapping templates for the company."""
    res = await db.execute(
        text("SELECT tally_config FROM public.companies WHERE id = :company_id"),
        {"company_id": user.company_id}
    )
    row = res.fetchone()
    tally_config = row[0] if row and row[0] else {}
    templates = tally_config.get("mapping_templates", {})
    return {"templates": templates}

# ── Import excel rows to vouchers ─────────────────────────────────────────────

@router.post("/import")
async def import_excel_rows(
    payload: ImportRowsPayload,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Takes mapped rows, validates data, creates local accounting_vouchers,
    and returns sync ready results.
    """
    await db.execute(text(f"SET search_path TO {user.db_schema}, public"))
    
    mapping = payload.mapping
    created_count = 0
    errors = []
    
    def get_val(row, std_key):
        ex_header = mapping.get(std_key)
        return row.get(ex_header) if ex_header else None

    # Group rows by invoice number to handle multiple line items
    invoices = {}
    for idx, r in enumerate(payload.rows):
        inv_no = get_val(r, "voucher_number")
        if not inv_no:
            errors.append(f"Row {idx+1}: Missing invoice/voucher number.")
            continue
        if inv_no not in invoices:
            invoices[inv_no] = []
        invoices[inv_no].append(r)
        
    for inv_no, rows in invoices.items():
        first_row = rows[0]
        party_name = get_val(first_row, "party_name") or "Unknown Party"
        gstin = get_val(first_row, "party_gstin")
        
        try:
            # 1. Check/create party
            party_res = await db.execute(text("""
                SELECT id FROM parties WHERE LOWER(name) = LOWER(:name) LIMIT 1
            """), {"name": party_name.strip()})
            p_row = party_res.fetchone()
            
            if p_row:
                party_id = str(p_row[0])
            else:
                party_id = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO parties (id, name, party_type, gstin, created_at, updated_at)
                    VALUES (:id, :name, :ptype, :gstin, NOW(), NOW())
                """), {
                    "id": party_id,
                    "name": party_name.strip(),
                    "ptype": "supplier" if payload.voucher_type == "purchase" else "customer",
                    "gstin": gstin
                })
            
            # 2. Parse amounts & line items
            line_items = []
            subtotal = 0.0
            cgst = 0.0
            sgst = 0.0
            igst = 0.0
            total = 0.0
            
            for r in rows:
                item_name = get_val(r, "item_name") or "General Item"
                qty = float(get_val(r, "quantity") or 1)
                rate = float(get_val(r, "rate") or 0)
                hsn = get_val(r, "HSN")
                
                # Check for row-specific values, default to qty * rate
                item_taxable = qty * rate
                
                line_items.append({
                    "item_name": item_name,
                    "hsn_code": hsn,
                    "qty": qty,
                    "unit": "PCS",
                    "rate": rate,
                    "gst_rate": 18.0,
                    "taxable": item_taxable,
                    "cgst": item_taxable * 0.09,
                    "sgst": item_taxable * 0.09,
                    "igst": 0.0,
                    "total": item_taxable * 1.18
                })
                
                subtotal += item_taxable
                cgst += item_taxable * 0.09
                sgst += item_taxable * 0.09
                total += item_taxable * 1.18
                
            # If the excel contains column totals, override computed values
            total_val = get_val(first_row, "total")
            if total_val:
                total = float(total_val)
                
            sub_val = get_val(first_row, "subtotal")
            if sub_val:
                subtotal = float(sub_val)
                
            cgst_val = get_val(first_row, "cgst")
            sgst_val = get_val(first_row, "sgst")
            igst_val = get_val(first_row, "igst")
            if cgst_val: cgst = float(cgst_val)
            if sgst_val: sgst = float(sgst_val)
            if igst_val: igst = float(igst_val)
            
            # 3. Create Voucher
            v_date_str = get_val(first_row, "voucher_date") or datetime.now().strftime("%Y-%m-%d")
            # Parse date safely
            try:
                from datetime import datetime as dt
                v_date = dt.strptime(v_date_str[:10], "%Y-%m-%d").date()
            except:
                v_date = datetime.now().date()
                
            # Check for duplicate voucher number
            dup = await db.execute(text(
                "SELECT 1 FROM accounting_vouchers WHERE voucher_number = :v"
            ), {"v": inv_no})
            v_num = inv_no
            if dup.fetchone():
                v_num = f"{inv_no}-{uuid.uuid4().hex[:4].upper()}"
                
            vid = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO accounting_vouchers (
                    id, voucher_number, voucher_type, voucher_date,
                    party_id, reference_number, line_items,
                    subtotal, total_cgst, total_sgst, total_igst, total,
                    narration, tally_synced, is_cancelled, created_by, created_at, updated_at
                ) VALUES (
                    :id, :vnum, CAST(:vtype AS voucher_type_enum), :vdate,
                    :party_id, :ref, CAST(:line_items AS jsonb),
                    :subtotal, :cgst, :sgst, :igst, :total,
                    :narration, false, false, :user_id, NOW(), NOW()
                )
            """), {
                "id": vid,
                "vnum": v_num,
                "vtype": payload.voucher_type,
                "vdate": v_date,
                "party_id": uuid.UUID(party_id),
                "ref": inv_no,
                "line_items": json.dumps(line_items),
                "subtotal": subtotal,
                "cgst": cgst,
                "sgst": sgst,
                "igst": igst,
                "total": total,
                "narration": f"Excel Import — {party_name}",
                "user_id": uuid.UUID(str(user.id)) if user.id else None
            })
            
            created_count += 1
            
        except Exception as e:
            errors.append(f"Invoice {inv_no}: {str(e)}")
            
    if errors:
        await db.rollback()
        return {"success": False, "created": 0, "errors": errors}
        
    await db.commit()
    return {"success": True, "created": created_count, "errors": []}
