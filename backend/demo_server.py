"""
Daynisc ERP — Demo Server (No Database Required)
Serves all frontend API endpoints with realistic in-memory data.
Run: python demo_server.py
"""
from __future__ import annotations
import uuid
import random
from datetime import datetime, timedelta, date
from typing import Optional, List, Any

from fastapi import FastAPI, HTTPException, Header, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Daynisc ERP Demo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ────────────────────────────────────────────────────────────────────

def rand_date(days_back=180):
    return (datetime.now() - timedelta(days=random.randint(0, days_back))).strftime("%Y-%m-%d")

def rand_amount(lo=5000, hi=500000):
    return round(random.uniform(lo, hi), 2)

COMPANY_NAMES = [
    "Sharma Traders", "Patel Enterprises", "Kumar & Sons", "Gupta Agencies",
    "Mehta Distributors", "Singh Trading Co.", "Joshi Fabrics", "Agarwal Steel",
    "Verma Chemicals", "Reddy Pharmaceuticals", "Nair Exports", "Pillai & Bros",
    "Iyer Electronics", "Rao Constructions", "Kapoor Jewellers",
]
ITEM_NAMES = [
    "Steel Rods 12mm", "Cement Bags 50kg", "Copper Wire 2.5mm", "LED Bulbs 9W",
    "PVC Pipe 1inch", "Tiles 60x60", "Paint White 20L", "Lubricant Oil 5L",
    "Safety Gloves", "Drill Bits Set", "MS Angle Iron", "Polypropylene Bags",
    "Cardboard Boxes", "HDPE Granules", "Chemical Grade Salt",
]
STATUSES_ORDER = ["draft", "confirmed", "dispatched", "delivered", "cancelled"]

# ── Seed Data ──────────────────────────────────────────────────────────────────

DEMO_TOKEN = "demo-jwt-token-daynisc-2025"

USERS_DB: dict = {
    "9999999999": {
        "id": "user-001",
        "phone": "9999999999",
        "name": "Bhavesh Patel",
        "email": "bhavesh@daynisc.com",
        "role": "owner",
        "company_id": "co-001",
    }
}

COMPANIES_DB: dict = {
    "co-001": {
        "id": "co-001",
        "name": "Daynisc Pvt Ltd",
        "gstin": "27AABCD1234E1Z5",
        "plan": "Enterprise",
        "schema_name": "demo",
    }
}

def make_orders(n=35):
    orders = []
    for i in range(n):
        cust = random.choice(COMPANY_NAMES)
        status = random.choices(STATUSES_ORDER, weights=[5, 10, 15, 50, 10])[0]
        amt = rand_amount(10000, 800000)
        orders.append({
            "id": f"ord-{i+1:04d}",
            "order_number": f"SO-2025-{i+1001}",
            "customer_name": cust,
            "customer_id": f"cu-{i%15+1:03d}",
            "order_date": rand_date(120),
            "delivery_date": rand_date(60),
            "po_number": f"PO-{random.randint(10000,99999)}" if random.random() > 0.3 else None,
            "total_amount": amt,
            "outstanding": round(amt * random.uniform(0, 0.6), 2) if status not in ("cancelled","delivered") else 0,
            "status": status,
            "items_count": random.randint(1, 8),
        })
    return orders

def make_purchase_orders(n=28):
    orders = []
    for i in range(n):
        supplier = random.choice(COMPANY_NAMES)
        status = random.choices(["draft","confirmed","received","partial","cancelled"], weights=[5,15,50,20,10])[0]
        amt = rand_amount(8000, 600000)
        orders.append({
            "id": f"po-{i+1:04d}",
            "po_number": f"PO-2025-{i+2001}",
            "supplier_name": supplier,
            "supplier_id": f"su-{i%15+1:03d}",
            "order_date": rand_date(120),
            "expected_date": rand_date(60),
            "total_amount": amt,
            "outstanding": round(amt * random.uniform(0, 0.5), 2) if status not in ("cancelled",) else 0,
            "status": status,
            "items_count": random.randint(1, 6),
        })
    return orders

def make_vouchers(n=40):
    vouchers = []
    for i in range(n):
        vtype = random.choices(["sales","purchase","payment","receipt","journal"], weights=[30,30,15,15,10])[0]
        total = rand_amount(5000, 400000)
        vouchers.append({
            "id": f"vch-{i+1:04d}",
            "voucher_number": f"{'SAL' if vtype=='sales' else 'PUR' if vtype=='purchase' else 'PAY' if vtype=='payment' else 'REC' if vtype=='receipt' else 'JNL'}-{i+3001}",
            "voucher_type": vtype,
            "voucher_date": rand_date(90),
            "party_name": random.choice(COMPANY_NAMES),
            "subtotal": round(total / 1.18, 2),
            "total_cgst": round(total * 0.09 / 1.18, 2),
            "total_sgst": round(total * 0.09 / 1.18, 2),
            "total_igst": 0.0,
            "total": total,
            "tally_synced": random.random() > 0.3,
            "is_cancelled": False,
            "narration": f"Auto entry for {vtype}",
        })
    return vouchers

def make_inventory(n=25):
    items = []
    for i in range(n):
        stock = random.randint(0, 500)
        reorder = random.randint(20, 80)
        items.append({
            "id": f"item-{i+1:04d}",
            "item_code": f"SKU-{i+1001}",
            "name": ITEM_NAMES[i % len(ITEM_NAMES)],
            "unit": random.choice(["PCS","KG","MTR","BOX","LTR"]),
            "category": random.choice(["Raw Material","Finished Good","Consumable","Packaging"]),
            "hsn_code": f"{random.randint(1000,9999)}",
            "gst_rate": random.choice([5.0, 12.0, 18.0, 28.0]),
            "purchase_rate": rand_amount(100, 5000),
            "selling_rate": rand_amount(150, 8000),
            "current_stock": stock,
            "reorder_level": reorder,
            "warehouse": "Main Warehouse",
            "low_stock": stock < reorder,
        })
    return items

def make_parties(n=20):
    parties = []
    for i in range(n):
        ptype = "customer" if i < 12 else "supplier"
        outstanding = rand_amount(0, 200000) if random.random() > 0.3 else 0
        parties.append({
            "id": f"party-{i+1:04d}",
            "name": COMPANY_NAMES[i % len(COMPANY_NAMES)],
            "party_type": ptype,
            "gstin": f"27AABCD{random.randint(1000,9999)}E1Z{random.randint(1,9)}",
            "phone": f"9{random.randint(100000000,999999999)}",
            "email": f"contact@{COMPANY_NAMES[i%len(COMPANY_NAMES)].lower().replace(' ','')}.com",
            "city": random.choice(["Mumbai","Delhi","Pune","Surat","Ahmedabad","Chennai","Kolkata"]),
            "receivable": outstanding if ptype == "customer" else 0,
            "payable": outstanding if ptype == "supplier" else 0,
            "invoice_count": random.randint(1, 25),
            "days_overdue": random.randint(0, 90),
            "aging_bucket": random.choice(["Current","1-30 days","31-60 days","61-90 days","90+ days"]),
        })
    return parties

def make_documents(n=15):
    docs = []
    statuses = ["extracted","needs_review","pushed","failed"]
    for i in range(n):
        status = random.choices(statuses, weights=[30,40,20,10])[0]
        docs.append({
            "id": f"doc-{i+1:04d}",
            "document_type": random.choice(["purchase_bill","invoice","payment_screenshot","lr","other"]),
            "original_filename": f"invoice_{random.randint(1000,9999)}.pdf",
            "status": status,
            "confidence_score": round(random.uniform(0.72, 0.98), 4),
            "language": "en",
            "is_duplicate": False,
            "created_at": rand_date(30),
            "extracted_data": {
                "party_name": random.choice(COMPANY_NAMES),
                "invoice_number": f"INV-{random.randint(1000,9999)}",
                "invoice_date": rand_date(30),
                "total_amount": rand_amount(5000, 300000),
                "total_cgst": rand_amount(200, 15000),
                "total_sgst": rand_amount(200, 15000),
                "line_items": [
                    {"item_name": random.choice(ITEM_NAMES), "qty": random.randint(1,100),
                     "rate": rand_amount(100,5000), "total": rand_amount(500,50000)}
                    for _ in range(random.randint(1, 4))
                ],
                "confidence": {"overall": round(random.uniform(0.72, 0.98), 2)},
            }
        })
    return docs

def make_dashboard():
    orders = SEED_ORDERS
    vouchers = SEED_VOUCHERS
    total_revenue = sum(v["total"] for v in vouchers if v["voucher_type"] == "sales")
    total_purchase = sum(v["total"] for v in vouchers if v["voucher_type"] == "purchase")
    outstanding = sum(p["receivable"] for p in SEED_PARTIES if p["party_type"] == "customer")
    low_stock = sum(1 for i in SEED_INVENTORY if i["low_stock"])

    # Monthly revenue last 6 months
    months = []
    now = datetime.now()
    for m in range(5, -1, -1):
        dt = now - timedelta(days=30 * m)
        months.append({
            "month": dt.strftime("%b %Y"),
            "revenue": rand_amount(200000, 1200000),
            "expense": rand_amount(100000, 800000),
        })

    return {
        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "total_purchase": round(total_purchase, 2),
            "outstanding_receivable": round(outstanding, 2),
            "low_stock_items": low_stock,
            "active_orders": sum(1 for o in orders if o["status"] in ("confirmed","dispatched")),
            "documents_pending": sum(1 for d in SEED_DOCUMENTS if d["status"] == "needs_review"),
        },
        "monthly_revenue": months,
        "top_customers": sorted(
            [{"name": p["name"], "revenue": rand_amount(50000, 800000)} for p in SEED_PARTIES if p["party_type"] == "customer"],
            key=lambda x: -x["revenue"]
        )[:5],
        "order_status_breakdown": {
            s: sum(1 for o in orders if o["status"] == s)
            for s in STATUSES_ORDER
        },
        "recent_orders": sorted(orders, key=lambda x: x["order_date"], reverse=True)[:8],
        "alerts": [
            {"type": "low_stock", "message": f"{low_stock} items below reorder level", "severity": "warning"},
            {"type": "overdue", "message": f"₹{outstanding:,.0f} receivable outstanding", "severity": "info"},
        ],
    }

# ── Seed ───────────────────────────────────────────────────────────────────────
SEED_ORDERS = make_orders()
SEED_PO = make_purchase_orders()
SEED_VOUCHERS = make_vouchers()
SEED_INVENTORY = make_inventory()
SEED_PARTIES = make_parties()
SEED_DOCUMENTS = make_documents()

# In-memory OTP store
OTP_STORE: dict = {}

# ── Auth Routes ────────────────────────────────────────────────────────────────

class SendOTPReq(BaseModel):
    phone: str

class VerifyOTPReq(BaseModel):
    phone: str
    otp: str

@app.post("/api/v1/auth/send-otp")
async def send_otp(body: SendOTPReq):
    OTP_STORE[body.phone] = "989898"
    print(f"[DEMO] OTP for {body.phone} is 989898")
    return {"message": "OTP sent (demo: use 989898)", "dev_otp": "989898"}

@app.post("/api/v1/auth/verify-otp")
async def verify_otp(body: VerifyOTPReq):
    stored = OTP_STORE.get(body.phone, "989898")
    if body.otp != stored:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    user = USERS_DB.get(body.phone) or {
        "id": str(uuid.uuid4()),
        "phone": body.phone,
        "name": "Demo User",
        "email": "demo@daynisc.com",
        "role": "owner",
        "company_id": "co-001",
    }
    company = COMPANIES_DB["co-001"]
    return {
        "access_token": DEMO_TOKEN,
        "refresh_token": DEMO_TOKEN + "-refresh",
        "token_type": "bearer",
        "user": user,
        "company": company,
    }

@app.post("/api/v1/auth/refresh")
async def refresh_token(body: dict = {}):
    return {"access_token": DEMO_TOKEN, "token_type": "bearer"}

@app.get("/api/v1/auth/me")
async def get_me(authorization: str = Header(default="")):
    user = USERS_DB["9999999999"]
    company = COMPANIES_DB["co-001"]
    return {"user": user, "company": company}

# ── Root ──────────────────────────────────────────────────────────────────────

from fastapi.responses import RedirectResponse

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

# ── Dashboard ──────────────────────────────────────────────────────────────────

@app.get("/api/v1/dashboard")
async def dashboard():
    return make_dashboard()

# ── Sales ──────────────────────────────────────────────────────────────────────

@app.get("/api/v1/sales/orders")
async def list_sales_orders(status: Optional[str] = None, limit: int = 100):
    items = SEED_ORDERS
    if status:
        items = [o for o in items if o["status"] == status]
    return {"items": items[:limit], "total": len(items)}

@app.get("/api/v1/sales/orders/{order_id}")
async def get_sales_order(order_id: str):
    for o in SEED_ORDERS:
        if o["id"] == order_id:
            return o
    raise HTTPException(404, "Order not found")

# ── Purchase ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/purchase/orders")
async def list_purchase_orders(status: Optional[str] = None, limit: int = 100):
    items = SEED_PO
    if status:
        items = [o for o in items if o["status"] == status]
    return {"items": items[:limit], "total": len(items)}

# ── Accounting ────────────────────────────────────────────────────────────────

@app.get("/api/v1/accounting/vouchers")
async def list_vouchers(voucher_type: Optional[str] = None, limit: int = 100):
    items = SEED_VOUCHERS
    if voucher_type:
        items = [v for v in items if v["voucher_type"] == voucher_type]
    return {"items": items[:limit], "total": len(items)}

@app.get("/api/v1/accounting/outstanding")
async def outstanding(party_type: Optional[str] = None, limit: int = 100):
    items = SEED_PARTIES
    if party_type == "customer":
        items = [p for p in items if p["party_type"] == "customer" and p["receivable"] > 0]
    elif party_type == "supplier":
        items = [p for p in items if p["party_type"] == "supplier" and p["payable"] > 0]
    return {"items": items[:limit], "total": len(items)}

@app.get("/api/v1/accounting/ledger")
async def ledger(limit: int = 50):
    entries = []
    for v in SEED_VOUCHERS[:limit]:
        entries.append({
            "date": v["voucher_date"],
            "voucher_number": v["voucher_number"],
            "narration": v["narration"],
            "debit": v["total"] if v["voucher_type"] in ("purchase", "payment") else 0,
            "credit": v["total"] if v["voucher_type"] in ("sales", "receipt") else 0,
            "balance": rand_amount(50000, 2000000),
        })
    return {"items": entries}

# ── Inventory ─────────────────────────────────────────────────────────────────

# ── Inventory ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/inventory/items")
async def list_inventory(category: Optional[str] = None, low_stock: Optional[bool] = None, limit: int = 100):
    items = SEED_INVENTORY
    if category:
        items = [i for i in items if i["category"] == category]
    if low_stock is True:
        items = [i for i in items if i["low_stock"]]
    return {"items": items[:limit], "total": len(items)}


# ── CSV/Excel Import In-Memory Engine ─────────────────────────────────────────

def parse_xlsx_data_demo(file_bytes: bytes) -> list[list[str]]:
    import zipfile
    import xml.etree.ElementTree as ET
    import io
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
        print(f"Demo Fallback XLSX parser error: {e}")
        raise e
    
    valid_rows = [r for r in rows if any(str(cell).strip() for cell in r)]
    if not valid_rows:
        return []
    max_len = max(len(r) for r in valid_rows)
    for r in valid_rows:
        while len(r) < max_len:
            r.append("")
    return valid_rows


def parse_excel_or_csv_demo(file_bytes: bytes, filename: str) -> list[dict]:
    import csv
    import io
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
            all_rows = parse_xlsx_data_demo(file_bytes)
            
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


def generate_sku_demo(name: str) -> str:
    import re
    clean = re.sub(r'[^A-Za-z0-9]', '', name).upper()
    prefix = clean[:8] if clean else "ITEM"
    rand_suffix = "".join(random.choices("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=4))
    return f"{prefix}-{rand_suffix}"


@app.post("/api/v1/inventory/import-sheet")
async def demo_import_sheet(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename or "file.csv"
    
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .csv or .xlsx / .xls file."
        )
        
    try:
        rows = parse_excel_or_csv_demo(contents, filename)
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
                
    if not title_key and headers:
        title_key = headers[0]
        
    existing_names = {i["name"].lower().strip() for i in SEED_INVENTORY}
    existing_codes = {i["item_code"].lower().strip() for i in SEED_INVENTORY}
    
    success_count = 0
    skipped_count = 0
    imported_items = []
    
    for row in rows:
        name_val = row.get(title_key, "").strip() if title_key else ""
        if not name_val:
            continue
            
        if name_val.lower().strip() in existing_names:
            skipped_count += 1
            continue
            
        dept_val = row.get(dept_key, "").strip() if dept_key else "General"
        if not dept_val:
            dept_val = "General"
            
        code_val = ""
        if code_key:
            code_val = row.get(code_key, "").strip()
        if not code_val:
            code_val = generate_sku_demo(name_val)
            while code_val.lower().strip() in existing_codes:
                code_val = generate_sku_demo(name_val)
                
        existing_names.add(name_val.lower().strip())
        existing_codes.add(code_val.lower().strip())
        
        # Fuzzy match other columns (optional)
        hsn_val = ""
        for hk in ["hsn_code", "hsn", "hsncode"]:
            h_val = row.get(hk, "")
            if h_val:
                hsn_val = str(h_val).strip()[:8]
                break
        if not hsn_val:
            hsn_val = str(random.randint(1000, 9999))
                
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
                
        new_item = {
            "id": f"item-{len(SEED_INVENTORY) + 1:04d}",
            "item_code": code_val,
            "name": name_val,
            "unit": unit_val,
            "category": dept_val,
            "hsn_code": hsn_val,
            "gst_rate": gst_val,
            "purchase_rate": round(random.uniform(100, 5000), 2),
            "selling_rate": round(random.uniform(150, 8000), 2),
            "current_stock": 0,
            "reorder_level": 10,
            "warehouse": "Main Warehouse",
            "low_stock": False,
        }
        
        SEED_INVENTORY.append(new_item)
        success_count += 1
        imported_items.append({
            "item_name": name_val,
            "item_code": code_val,
            "item_group": dept_val,
            "unit": unit_val
        })
        
    return {
        "success": True,
        "message": f"Demo Import completed. Successfully imported {success_count} items, skipped {skipped_count} duplicates.",
        "imported": success_count,
        "skipped": skipped_count,
        "items": imported_items
    }

@app.get("/api/v1/inventory/warehouses")
async def list_warehouses():
    return {"items": [{"id": "wh-001", "name": "Main Warehouse", "is_default": True, "location": "Mumbai"}]}

@app.get("/api/v1/inventory/stock-movements")
async def stock_movements(limit: int = 50):
    moves = []
    for i in range(min(limit, 30)):
        item = random.choice(SEED_INVENTORY)
        moves.append({
            "id": f"mv-{i+1:04d}",
            "date": rand_date(30),
            "item_name": item["name"],
            "item_code": item["item_code"],
            "movement_type": random.choice(["in","out","transfer"]),
            "quantity": random.randint(1, 100),
            "unit": item["unit"],
            "reference": f"SO-{random.randint(1000,9999)}",
            "warehouse": "Main Warehouse",
        })
    return {"items": moves}

# ── Parties ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/parties")
async def list_parties(party_type: Optional[str] = None, limit: int = 100):
    items = SEED_PARTIES
    if party_type:
        items = [p for p in items if p["party_type"] == party_type]
    return {"items": items[:limit], "total": len(items)}

# ── Documents / AI ────────────────────────────────────────────────────────────

@app.get("/api/v1/documents")
async def list_documents(status: Optional[str] = None, limit: int = 50):
    items = SEED_DOCUMENTS
    if status:
        items = [d for d in items if d["status"] == status]
    return {"items": items[:limit], "count": len(items)}

@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(default="purchase")
):
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    
    # Map input type to standardized type
    mapped_type = {
        "purchase": "purchase_bill",
        "sales": "invoice",
        "lr": "lr",
        "payment": "payment_screenshot",
        "bank_statement": "bank_statement",
        "other": "other"
    }.get(document_type, document_type)
    
    # Generate realistic metadata fields based on type
    if mapped_type == "lr":
        extracted = {
            "lr_number": f"LR-{random.randint(10000,99999)}",
            "invoice_date": datetime.now().strftime("%Y-%m-%d"),
            "transporter_name": f"{random.choice(COMPANY_NAMES)} Transports",
            "vehicle_number": f"MH-{random.randint(12,99)}-{chr(random.randint(65,90))}{chr(random.randint(65,90))}-{random.randint(1000,9999)}",
            "total_amount": rand_amount(1500, 25000),
            "confidence": {
                "lr_number": 0.95,
                "invoice_date": 0.98,
                "transporter_name": 0.89,
                "vehicle_number": 0.96,
                "total_amount": 0.92
            }
        }
    elif mapped_type == "payment_screenshot":
        extracted = {
            "utr_number": f"UTR{random.randint(1000000000,9999999999)}",
            "invoice_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": random.choice(["UPI", "NEFT", "RTGS", "IMPS"]),
            "bank_reference": f"{random.choice(['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'])}",
            "total_amount": rand_amount(5000, 150000),
            "confidence": {
                "utr_number": 0.97,
                "invoice_date": 0.99,
                "payment_mode": 0.95,
                "bank_reference": 0.91,
                "total_amount": 0.98
            }
        }
    elif mapped_type == "bank_statement":
        extracted = {
            "document_type": "bank_statement",
            "bank_name": "HDFC Bank",
            "account_number": "XXXXXX987654",
            "statement_period": "May 2026",
            "total_amount": 315500.00,
            "transactions": [
                {
                    "date": "2026-05-12",
                    "description": "UPI-ADITYA BIRLA CHEMICALS-992",
                    "reference_number": "TXN9928129",
                    "withdrawal": 15000.00,
                    "deposit": 0.00,
                    "balance": 284500.00
                },
                {
                    "date": "2026-05-15",
                    "description": "NEFT-RELIANCE INDUSTRIES LTD-20",
                    "reference_number": "TXN2023199",
                    "withdrawal": 0.00,
                    "deposit": 120000.00,
                    "balance": 404500.00
                },
                {
                    "date": "2026-05-20",
                    "description": "SMS CHARGES HDFC",
                    "reference_number": "CHG881293",
                    "withdrawal": 500.00,
                    "deposit": 0.00,
                    "balance": 404000.00
                },
                {
                    "date": "2026-05-25",
                    "description": "UPI-TATA POWER POWER-88122",
                    "reference_number": "TXN8812211",
                    "withdrawal": 0.00,
                    "deposit": 180000.00,
                    "balance": 584000.00
                }
            ],
            "confidence": {
                "overall": 0.94,
                "bank_name": 0.98,
                "account_number": 0.95,
                "transactions": 0.92
            }
        }
    else:
        extracted = {
            "party_name": random.choice(COMPANY_NAMES),
            "invoice_number": f"INV-{random.randint(1000,9999)}",
            "invoice_date": datetime.now().strftime("%Y-%m-%d"),
            "party_gstin": f"27AABCD{random.randint(1000,9999)}E1Z{random.randint(1,9)}",
            "vehicle_number": f"MH-{random.randint(12,99)}-{chr(random.randint(65,90))}{chr(random.randint(65,90))}-{random.randint(1000,9999)}",
            "total_amount": rand_amount(5000, 200000),
            "line_items": [
                {"item_name": random.choice(ITEM_NAMES), "quantity": random.randint(1,10), "unit": "PCS",
                 "rate": rand_amount(100,2000), "gst_rate": 18.0, "total": rand_amount(500,20000)}
                for _ in range(random.randint(1, 3))
            ],
            "confidence": {
                "party_name": 0.92,
                "invoice_number": 0.96,
                "invoice_date": 0.98,
                "party_gstin": 0.90,
                "total_amount": 0.94
            }
        }
        
    new_doc = {
        "id": doc_id,
        "document_type": mapped_type,
        "original_filename": file.filename or f"doc_{random.randint(1000,9999)}.pdf",
        "status": "extracted",
        "confidence_score": round(random.uniform(0.85, 0.99), 4),
        "language": "en",
        "is_duplicate": False,
        "created_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "extracted_data": extracted
    }
    
    SEED_DOCUMENTS.insert(0, new_doc)
    
    return {
        "id": doc_id,
        "status": "extracted",
        "message": "✅ Demo mode: AI extraction simulated",
        "party_name": extracted.get("party_name") or extracted.get("transporter_name") or "Extracted Doc",
        "invoice_number": extracted.get("invoice_number") or extracted.get("lr_number") or extracted.get("utr_number") or "DOC-100",
        "total_amount": extracted.get("total_amount"),
        "confidence": new_doc["confidence_score"],
    }

@app.post("/api/v1/documents/{doc_id}/verify")
async def verify_document(doc_id: str, payload: dict):
    approve = payload.get("approve", False)
    return {
        "success": True,
        "status": "pushed" if approve else "rejected",
        "voucher_id": str(uuid.uuid4()) if approve else None,
    }

# ── Tally ─────────────────────────────────────────────────────────────────────

@app.get("/api/v1/tally/status")
async def tally_status():
    return {"connected": False, "message": "TallyPrime not connected (demo mode)", "pending_sync": 8}

@app.post("/api/v1/tally/test-connection")
async def tally_test(body: dict = {}):
    return {"connected": False, "message": "Demo mode — connect TallyPrime to enable sync"}

# ── Settings ──────────────────────────────────────────────────────────────────

@app.get("/api/v1/settings")
async def get_settings():
    return {"tally_url": "http://localhost:9000", "company_name": "", "ai_enabled": True}

@app.put("/api/v1/settings")
async def save_settings(body: dict):
    return {"success": True, "message": "Settings saved (demo mode)"}

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "mode": "demo", "version": "1.0.0"}

# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("  Daynisc ERP Demo Server")
    print("  API: http://localhost:8000")
    print("  Docs: http://localhost:8000/docs")
    print("  Login: any phone + OTP 989898")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
