"""
Inventory Service Router
Stock balance, item master, and low stock alerts.
"""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import io
import csv
import zipfile
import re
import random
import xml.etree.ElementTree as ET

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


# ── Stock Balance ─────────────────────────────────────────────────────────────

@router.get("/stock")
async def get_stock_balance(
    search: Optional[str] = None,
    low_stock_only: bool = False,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    conditions = []
    params: dict = {"limit": limit}

    if search:
        conditions.append("im.item_name ILIKE :search")
        params["search"] = f"%{search}%"
    if low_stock_only:
        conditions.append("sb.quantity < im.reorder_level AND im.reorder_level > 0")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    items = await _rows(db, f"""
        SELECT im.id, im.item_name, im.category, im.unit,
               im.hsn_code, im.gst_rate, im.reorder_level,
               COALESCE(SUM(sb.quantity), 0) AS quantity,
               COALESCE(AVG(sb.avg_rate), 0) AS avg_rate,
               COALESCE(SUM(sb.total_value), 0) AS total_value
        FROM item_master im
        LEFT JOIN stock_balance sb ON sb.item_id = im.id
        {where}
        GROUP BY im.id, im.item_name, im.category, im.unit,
                 im.hsn_code, im.gst_rate, im.reorder_level
        ORDER BY total_value DESC
        LIMIT :limit
    """, params)

    return {"items": items, "count": len(items)}


# ── Item Master ───────────────────────────────────────────────────────────────

@router.get("/items")
async def list_items(
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    conditions = []
    params: dict = {"limit": limit}

    if search:
        conditions.append("item_name ILIKE :search")
        params["search"] = f"%{search}%"

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    items = await _rows(db, f"""
        SELECT id, item_name, hsn_code, gst_rate, unit,
               reorder_level, category, description,
               created_at::text
        FROM item_master
        {where}
        ORDER BY item_name
        LIMIT :limit
    """, params)

    return {"items": items, "count": len(items)}


@router.get("/items/lookup")
async def lookup_item(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    q = code.strip()
    rows = await _rows(db, """
        SELECT im.id::text, im.item_code, im.item_name, COALESCE(im.item_group, 'General') AS category,
               im.unit, im.hsn_code, im.gst_rate, im.reorder_level,
               COALESCE(im.standard_rate, 0) AS purchase_rate,
               COALESCE(im.mrp, 0) AS selling_rate,
               COALESCE(SUM(sb.quantity), 0) AS quantity
        FROM item_master im
        LEFT JOIN stock_balance sb ON sb.item_id = im.id
        WHERE im.item_code ILIKE :code OR im.id::text = :code
        GROUP BY im.id, im.item_code, im.item_name, im.item_group, im.unit,
                 im.hsn_code, im.gst_rate, im.reorder_level, im.standard_rate, im.mrp
        LIMIT 1
    """, {"code": q})

    if rows:
        return {"found": True, "item": rows[0]}
    return {"found": False, "code": code}


@router.post("/items")
async def create_or_update_item(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    item_code = str(payload.get("item_code", "")).strip()
    item_name = str(payload.get("item_name", "")).strip()
    if not item_code or not item_name:
        raise HTTPException(status_code=400, detail="item_code and item_name are required")

    category = payload.get("category", "General") or "General"
    unit = str(payload.get("unit", "PCS") or "PCS").upper()
    hsn_code = payload.get("hsn_code")
    gst_rate = float(payload.get("gst_rate", 18.0) or 18.0)
    reorder_level = float(payload.get("reorder_level", 0.0) or 0.0)
    purchase_rate = float(payload.get("purchase_rate", 0.0) or 0.0)
    selling_rate = float(payload.get("selling_rate", 0.0) or 0.0)
    quantity = float(payload.get("quantity", 0.0) or 0.0)

    # Check if item_code exists
    existing = await _rows(db, "SELECT id, item_code, item_name FROM item_master WHERE item_code = :code LIMIT 1", {"code": item_code})

    if existing:
        item_id = existing[0]["id"]
        await db.execute(text("""
            UPDATE item_master
            SET item_name = :item_name,
                item_group = :category,
                unit = :unit,
                hsn_code = :hsn_code,
                gst_rate = :gst_rate,
                reorder_level = :reorder_level,
                standard_rate = :purchase_rate,
                mrp = :selling_rate,
                updated_at = NOW()
            WHERE id = :id
        """), {
            "id": item_id,
            "item_name": item_name,
            "category": category,
            "unit": unit,
            "hsn_code": hsn_code,
            "gst_rate": gst_rate,
            "reorder_level": reorder_level,
            "purchase_rate": purchase_rate,
            "selling_rate": selling_rate,
        })
        action = "updated"
    else:
        res = await db.execute(text("""
            INSERT INTO item_master (item_code, item_name, item_group, unit, hsn_code, gst_rate, reorder_level, standard_rate, mrp, is_purchased, is_sold, is_active)
            VALUES (:item_code, :item_name, :category, :unit, :hsn_code, :gst_rate, :reorder_level, :purchase_rate, :selling_rate, TRUE, TRUE, TRUE)
            RETURNING id::text
        """), {
            "item_code": item_code,
            "item_name": item_name,
            "category": category,
            "unit": unit,
            "hsn_code": hsn_code,
            "gst_rate": gst_rate,
            "reorder_level": reorder_level,
            "purchase_rate": purchase_rate,
            "selling_rate": selling_rate,
        })
        inserted = res.fetchone()
        item_id = inserted[0] if inserted else None
        action = "created"

    # If opening quantity > 0, record in stock_balance
    if quantity > 0 and item_id:
        # Get default warehouse
        wh_rows = await _rows(db, "SELECT id FROM warehouses LIMIT 1")
        wh_id = wh_rows[0]["id"] if wh_rows else None
        if wh_id:
            await db.execute(text("""
                INSERT INTO stock_balance (item_id, warehouse_id, quantity, avg_cost, total_value)
                VALUES (:item_id, :wh_id, :qty, :cost, :total_val)
                ON CONFLICT (item_id, warehouse_id, batch_number)
                DO UPDATE SET quantity = stock_balance.quantity + :qty,
                              last_updated = NOW()
            """), {
                "item_id": item_id,
                "wh_id": wh_id,
                "qty": quantity,
                "cost": purchase_rate,
                "total_val": quantity * purchase_rate,
            })

    await db.commit()

    return {
        "success": True,
        "action": action,
        "item": {
            "id": str(item_id),
            "item_code": item_code,
            "item_name": item_name,
            "category": category,
            "unit": unit,
            "quantity": quantity,
            "purchase_rate": purchase_rate,
            "selling_rate": selling_rate,
            "gst_rate": gst_rate,
            "hsn_code": hsn_code,
            "reorder_level": reorder_level
        }
    }


# ── Low Stock Alert ───────────────────────────────────────────────────────────

@router.get("/low-stock")
async def get_low_stock(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)

    items = await _rows(db, """
        SELECT im.id, im.item_name, im.category, im.unit,
               im.reorder_level,
               COALESCE(SUM(sb.quantity), 0) AS quantity,
               im.reorder_level - COALESCE(SUM(sb.quantity), 0) AS shortage
        FROM item_master im
        LEFT JOIN stock_balance sb ON sb.item_id = im.id
        WHERE im.reorder_level > 0
        GROUP BY im.id, im.item_name, im.category, im.unit, im.reorder_level
        HAVING COALESCE(SUM(sb.quantity), 0) < im.reorder_level
        ORDER BY shortage DESC
    """)

    return {"items": items, "count": len(items)}


# ── CSV/Excel Import Engine ───────────────────────────────────────────────────

def parse_xlsx_data(file_bytes: bytes) -> list[list[str]]:
    rows = []
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            shared_strings = []
            if "xl/sharedStrings.xml" in z.namelist():
                ss_xml = z.read("xl/sharedStrings.xml")
                root = ET.fromstring(ss_xml)
                for si in root.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                    t_nodes = si.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                    text_val = "".join(t.text for t in t_nodes if t.text)
                    shared_strings.append(text_val)
            
            sheet_xml = z.read("xl/worksheets/sheet1.xml")
            root = ET.fromstring(sheet_xml)
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            
            def col_to_idx(col_str):
                idx = 0
                for char in col_str:
                    if 'A' <= char <= 'Z':
                        idx = idx * 26 + (ord(char) - ord('A') + 1)
                return idx - 1

            for row_el in root.findall(".//ns:row", ns):
                row_idx = int(row_el.get("r", "1")) - 1
                while len(rows) <= row_idx:
                    rows.append([])
                
                cells = {}
                max_col_idx = -1
                for cell_el in row_el.findall("ns:c", ns):
                    r_attr = cell_el.get("r", "")
                    col_str = "".join([c for c in r_attr if c.isalpha()])
                    if not col_str:
                        continue
                    col_idx = col_to_idx(col_str)
                    max_col_idx = max(max_col_idx, col_idx)
                    
                    val_el = cell_el.find("ns:v", ns)
                    val = ""
                    if val_el is not None:
                        val = val_el.text or ""
                        if cell_el.get("t") == "s":
                            try:
                                idx = int(val)
                                if 0 <= idx < len(shared_strings):
                                    val = shared_strings[idx]
                            except ValueError:
                                pass
                    cells[col_idx] = val
                
                row_data = [""] * (max_col_idx + 1)
                for c_idx, val in cells.items():
                    row_data[c_idx] = val
                rows[row_idx] = row_data
    except Exception as e:
        print(f"Fallback XLSX parser error: {e}")
        raise e
    
    valid_rows = [r for r in rows if any(str(cell).strip() for cell in r)]
    if not valid_rows:
        return []
    max_len = max(len(r) for r in valid_rows)
    for r in valid_rows:
        while len(r) < max_len:
            r.append("")
    return valid_rows


def parse_excel_or_csv(file_bytes: bytes, filename: str) -> list[dict]:
    headers = []
    rows_data = []
    
    if filename.endswith(".csv"):
        try:
            text_content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_content = file_bytes.decode("latin-1")
            
        reader = csv.reader(io.StringIO(text_content))
        all_rows = list(reader)
        if not all_rows:
            return []
        headers = [h.strip() for h in all_rows[0]]
        rows_data = all_rows[1:]
    else:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb.active
            all_rows = []
            for r in sheet.iter_rows(values_only=True):
                all_rows.append([str(cell) if cell is not None else "" for cell in r])
        except ImportError:
            all_rows = parse_xlsx_data(file_bytes)
            
        if not all_rows:
            return []
        headers = [str(h).strip() for h in all_rows[0]]
        rows_data = all_rows[1:]
        
    result = []
    for row in rows_data:
        row_dict = {}
        for idx, h in enumerate(headers):
            if idx < len(row):
                row_dict[h] = str(row[idx]).strip()
            else:
                row_dict[h] = ""
        result.append(row_dict)
    return result


def generate_sku(name: str) -> str:
    clean = re.sub(r'[^A-Za-z0-9]', '', name).upper()
    prefix = clean[:8] if clean else "ITEM"
    rand_suffix = "".join(random.choices("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=4))
    return f"{prefix}-{rand_suffix}"


@router.post("/import-sheet")
async def import_sheet(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    
    contents = await file.read()
    filename = file.filename or "file.csv"
    
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .csv or .xlsx / .xls file."
        )
        
    try:
        rows = parse_excel_or_csv(contents, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse spreadsheet: {str(e)}")
        
    if not rows:
        return {
            "success": True,
            "message": "No rows found in the sheet.",
            "imported": 0,
            "skipped": 0,
            "items": []
        }
        
    # Headers fuzzy matching
    headers = list(rows[0].keys())
    
    title_candidates = ["title", "item_name", "item name", "name", "product", "product_name", "product name", "item"]
    dept_candidates = ["dept. name", "dept_name", "dept name", "department", "department_name", "department name", "item_group", "item group", "group", "category"]
    code_candidates = ["item_code", "item code", "code", "sku", "item_sku", "product_code"]
    
    title_key = None
    dept_key = None
    code_key = None
    
    for key in headers:
        normalized = key.lower().strip().replace("_", " ").replace(".", "")
        if normalized in [c.lower().replace("_", " ").replace(".", "") for c in title_candidates]:
            title_key = key
            break
            
    for key in headers:
        normalized = key.lower().strip().replace("_", " ").replace(".", "")
        if normalized in [c.lower().replace("_", " ").replace(".", "") for c in dept_candidates]:
            dept_key = key
            break
            
    for key in headers:
        normalized = key.lower().strip().replace("_", " ").replace(".", "")
        if normalized in [c.lower().replace("_", " ").replace(".", "") for c in code_candidates]:
            code_key = key
            break
            
    # Fallbacks
    if not title_key:
        for key in headers:
            if "title" in key.lower() or "name" in key.lower() or "product" in key.lower():
                title_key = key
                break
    if not dept_key:
        for key in headers:
            if "dept" in key.lower() or "group" in key.lower() or "category" in key.lower() or "department" in key.lower():
                dept_key = key
                break
                
    # Ultimate fallback: first column is title
    if not title_key and headers:
        title_key = headers[0]
        
    # Get existing items to prevent collision
    try:
        existing_items_res = await db.execute(text("SELECT item_name, item_code FROM item_master"))
        existing_rows = existing_items_res.fetchall()
        existing_names = {str(r[0]).lower().strip() for r in existing_rows}
        existing_codes = {str(r[1]).lower().strip() for r in existing_rows}
    except Exception:
        existing_names = set()
        existing_codes = set()
        
    success_count = 0
    skipped_count = 0
    imported_items = []
    
    try:
        for row in rows:
            name_val = row.get(title_key, "").strip() if title_key else ""
            if not name_val:
                continue
                
            # Check duplicate by name
            if name_val.lower().strip() in existing_names:
                skipped_count += 1
                continue
                
            dept_val = row.get(dept_key, "").strip() if dept_key else "General"
            if not dept_val:
                dept_val = "General"
                
            # Extract or generate code
            code_val = ""
            if code_key:
                code_val = row.get(code_key, "").strip()
            if not code_val:
                code_val = generate_sku(name_val)
                while code_val.lower().strip() in existing_codes:
                    code_val = generate_sku(name_val)
                    
            existing_names.add(name_val.lower().strip())
            existing_codes.add(code_val.lower().strip())
            
            # Fuzzy match other columns (optional)
            hsn_val = None
            for hk in ["hsn_code", "hsn", "hsncode"]:
                h_val = row.get(hk, "")
                if h_val:
                    hsn_val = str(h_val).strip()[:8]
                    break
                    
            gst_val = 18.0
            for gk in ["gst_rate", "gst", "tax", "gst%"]:
                g_val = row.get(gk, "")
                if g_val:
                    try:
                        gst_val = float(str(g_val).replace("%", "").strip())
                        break
                    except ValueError:
                        pass
                        
            unit_val = "KG"
            for uk in ["unit", "uom", "measure", "unit_of_measure"]:
                u_val = row.get(uk, "")
                if u_val:
                    unit_val = str(u_val).upper().strip()[:10]
                    break
                    
            # Insert item master
            await db.execute(text("""
                INSERT INTO item_master (item_code, item_name, item_group, unit, gst_rate, hsn_code, is_purchased, is_sold, is_active)
                VALUES (:item_code, :item_name, :item_group, :unit, :gst_rate, :hsn_code, TRUE, TRUE, TRUE)
            """), {
                "item_code": code_val,
                "item_name": name_val,
                "item_group": dept_val,
                "unit": unit_val,
                "gst_rate": gst_val,
                "hsn_code": hsn_val
            })
            
            success_count += 1
            imported_items.append({
                "item_name": name_val,
                "item_code": code_val,
                "item_group": dept_val,
                "unit": unit_val
            })
            
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")
        
    return {
        "success": True,
        "message": f"Import completed. Successfully imported {success_count} items, skipped {skipped_count} duplicates.",
        "imported": success_count,
        "skipped": skipped_count,
        "items": imported_items
    }
