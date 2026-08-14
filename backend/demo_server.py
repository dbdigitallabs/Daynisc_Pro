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
import socket


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
        "name": "Bhavesh Khimsuriya",
        "email": "bhavesh@daynisc.com",
        "role": "super_admin",
        "company_id": "co-001",
    },
    "9898551319": {
        "id": "user-002",
        "phone": "9898551319",
        "name": "Owner / Super Admin",
        "email": "owner@daynisc.com",
        "role": "super_admin",
        "company_id": "co-001",
    },
    "9876543210": {
        "id": "user-003",
        "phone": "9876543210",
        "name": "Ramesh Shah",
        "email": "ramesh@daynisc.com",
        "role": "accountant",
        "company_id": "co-001",
    },
    "9876543211": {
        "id": "user-004",
        "phone": "9876543211",
        "name": "Suresh Kumar",
        "email": "suresh@daynisc.com",
        "role": "inventory_manager",
        "company_id": "co-001",
    },
    "9876543212": {
        "id": "user-005",
        "phone": "9876543212",
        "name": "Mahesh Patel",
        "email": "mahesh@daynisc.com",
        "role": "production_supervisor",
        "company_id": "co-001",
    },
    "9876543213": {
        "id": "user-006",
        "phone": "9876543213",
        "name": "Vikram Nair",
        "email": "vikram@daynisc.com",
        "role": "sales_rep",
        "company_id": "co-001",
    },
    "9876543214": {
        "id": "user-007",
        "phone": "9876543214",
        "name": "Sanjay Pillai",
        "email": "sanjay@daynisc.com",
        "role": "warehouse_operator",
        "company_id": "co-001",
    },
    "9111111111": {
        "id": "user-008",
        "phone": "9111111111",
        "name": "Rajesh Sharma",
        "email": "rajesh@sharma.com",
        "role": "company_admin",
        "company_id": "co-002",
    },
    "9111111112": {
        "id": "user-009",
        "phone": "9111111112",
        "name": "Amit Verma",
        "email": "amit@sharma.com",
        "role": "accountant",
        "company_id": "co-002",
    }

}

COMPANIES_DB: dict = {
    "co-001": {
        "id": "co-001",
        "name": "Daynisc Pvt Ltd",
        "gstin": "27AABCD1234E1Z5",
        "plan": "Enterprise",
        "db_schema": "co_daynisc",
        "subscription_start": "2025-01-01",
        "subscription_expiry": "2025-12-31",
        "is_active": True,
    },
    "co-002": {
        "id": "co-002",
        "name": "Sharma Traders",
        "gstin": "27AABCD5678F2Z3",
        "plan": "SME",
        "db_schema": "co_sharma",
        "subscription_start": "2025-02-15",
        "subscription_expiry": "2026-06-30",
        "is_active": True,
        "parent_id": "co-001",
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

def make_production_orders(n=20):
    orders = []
    statuses = ["planned", "in_progress", "completed", "on_hold", "cancelled"]
    shifts = ["A", "B", "C"]
    for i in range(n):
        status = random.choices(statuses, weights=[30, 40, 20, 5, 5])[0]
        planned = float(random.randint(100, 2000))
        actual = float(random.randint(int(planned * 0.8), int(planned * 1.05))) if status == "completed" else (float(random.randint(0, int(planned * 0.7))) if status == "in_progress" else None)
        orders.append({
            "id": f"prod-{i+1:04d}",
            "order_number": f"PO-{datetime.now().year}-{i+5001}",
            "finished_name": random.choice(ITEM_NAMES),
            "planned_qty": planned,
            "actual_qty": actual,
            "status": status,
            "planned_date": rand_date(15),
            "shift": random.choice(shifts),
        })
    return orders

# ── Seed ───────────────────────────────────────────────────────────────────────
SEED_ORDERS = make_orders()
SEED_PO = make_purchase_orders()
SEED_VOUCHERS = make_vouchers()
SEED_INVENTORY = make_inventory()
SEED_PARTIES = make_parties()
SEED_DOCUMENTS = make_documents()
SEED_PRODUCTION_ORDERS = make_production_orders()

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

@app.get("/api/v1/purchase/orders")
async def list_purchase_orders(status: Optional[str] = None, limit: int = 100):
    items = SEED_PO
    if status:
        items = [o for o in items if o["status"] == status]
    return {"items": items[:limit], "total": len(items)}

# ── Production ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/production/orders")
async def list_production_orders(limit: int = 30):
    return {"items": SEED_PRODUCTION_ORDERS[:limit]}

@app.get("/api/v1/production/orders/{order_id}")
async def get_production_order(order_id: str):
    for o in SEED_PRODUCTION_ORDERS:
        if o["id"] == order_id:
            return o
    raise HTTPException(404, "Order not found")

# ── Accounting ────────────────────────────────────────────────────────────────

@app.get("/api/v1/accounting/vouchers")
async def list_vouchers(voucher_type: Optional[str] = None, tally_synced: Optional[bool] = None, limit: int = 2000):
    items = SEED_VOUCHERS
    if voucher_type:
        items = [v for v in items if v["voucher_type"] == voucher_type]
    if tally_synced is not None:
        items = [v for v in items if bool(v.get("tally_synced")) == tally_synced]
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

@app.get("/api/v1/inventory/stock")
async def get_inventory_stock(
    search: Optional[str] = None,
    item_code: Optional[str] = None,
    low_stock_only: Optional[bool] = None,
    warehouse_id: Optional[str] = None,
    limit: int = 100
):
    items = []
    query = search or item_code
    for item in SEED_INVENTORY:
        if query:
            q = query.lower()
            if q not in item["item_code"].lower() and q not in item["name"].lower() and q not in item["category"].lower():
                continue
        if low_stock_only and not item["low_stock"]:
            continue
        
        qty = float(item["current_stock"])
        val = qty * float(item["selling_rate"])
        items.append({
            "id": item["id"],
            "item_code": item["item_code"],
            "item_name": item["name"],
            "category": item["category"],
            "unit": item["unit"],
            "quantity": qty,
            "reorder_level": float(item["reorder_level"]),
            "value": round(val, 2),
            "total_value": round(val, 2),
            "avg_rate": float(item["selling_rate"]),
            "warehouse_name": item["warehouse"],
            "hsn_code": item["hsn_code"],
            "gst_rate": float(item["gst_rate"])
        })
    return {"items": items[:limit]}

@app.get("/api/v1/inventory/ledger/all")
async def get_inventory_ledger(limit: int = 30):
    ledger = []
    # Seed some movements based on items
    for i in range(limit):
        item = random.choice(SEED_INVENTORY)
        mtype = random.choice(["inward", "outward"])
        qty = float(random.randint(1, 100))
        ledger.append({
            "id": f"mv-{i+1:04d}",
            "item_name": item["name"],
            "movement_type": mtype,
            "quantity": qty,
            "balance_qty": float(item["current_stock"]),
            "unit": item["unit"],
            "warehouse_name": "Main Warehouse",
            "movement_date": rand_date(30),
        })
    return {"ledger": ledger}

class RecordMovementReq(BaseModel):
    item_code: str
    warehouse_id: str
    movement_type: str
    quantity: float
    unit: str = "KG"
    batch_number: Optional[str] = None
    narration: Optional[str] = None

@app.post("/api/v1/inventory/movements")
async def record_inventory_movement(body: RecordMovementReq):
    # Find item and update stock
    item_found = None
    for item in SEED_INVENTORY:
        if item["item_code"] == body.item_code:
            item_found = item
            qty_change = body.quantity
            if body.movement_type == "outward" or body.movement_type == "out":
                item["current_stock"] = max(0, item["current_stock"] - int(qty_change))
            else:
                item["current_stock"] = item["current_stock"] + int(qty_change)
            item["low_stock"] = item["current_stock"] < item["reorder_level"]
            break
            
    return {
        "success": True, 
        "message": f"Recorded stock {body.movement_type} of {body.quantity} {body.unit} for item {body.item_code} successfully."
    }

@app.get("/api/v1/inventory/valuation")
async def get_inventory_valuation(method: str = "weighted_average"):
    total_val = 0.0
    for item in SEED_INVENTORY:
        total_val += float(item["current_stock"]) * float(item["selling_rate"])
    return {
        "success": True,
        "total_value": round(total_val, 2),
        "method": method,
        "items_count": len(SEED_INVENTORY)
    }


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

def parse_uploaded_bank_statement_demo(file_bytes: bytes, filename: str) -> dict:
    import csv, io
    filename_lower = filename.lower()
    rows = []
    
    if filename_lower.endswith(".csv") or b"," in file_bytes[:1000] or b"\n" in file_bytes[:1000]:
        try:
            text_str = file_bytes.decode("utf-8")
        except Exception:
            text_str = file_bytes.decode("latin-1")
            
        reader = csv.reader(io.StringIO(text_str))
        all_rows = list(reader)
        if all_rows:
            headers = [str(h).strip() for h in all_rows[0]]
            data_rows = all_rows[1:]
            for r in data_rows:
                if not any(str(c).strip() for c in r):
                    continue
                r_dict = {}
                for idx, h in enumerate(headers):
                    r_dict[h] = r[idx].strip() if idx < len(r) else ""
                rows.append(r_dict)
    elif filename_lower.endswith((".xlsx", ".xls")):
        rows = parse_excel_or_csv_demo(file_bytes, filename)

    if not rows:
        return None
        
    sample = rows[0]
    headers_lower = {k.lower().replace("_", "").replace(" ", "").replace(".", ""): k for k in sample.keys()}
    
    date_k = headers_lower.get("date") or headers_lower.get("txndate") or headers_lower.get("valuedate") or headers_lower.get("transactiondate")
    drcr_k = headers_lower.get("drcr") or headers_lower.get("type") or headers_lower.get("mode") or headers_lower.get("transactiontype")
    amt_k = headers_lower.get("amount") or headers_lower.get("txnamount") or headers_lower.get("total")
    bal_k = headers_lower.get("balance") or headers_lower.get("closingbalance") or headers_lower.get("availablebalance")
    name_k = headers_lower.get("name") or headers_lower.get("party") or headers_lower.get("description") or headers_lower.get("particulars") or headers_lower.get("narration") or headers_lower.get("remarks")
    mode_k = headers_lower.get("mode") or headers_lower.get("channel") or headers_lower.get("method")
    
    debit_k = headers_lower.get("withdrawal") or headers_lower.get("debit") or headers_lower.get("dr")
    credit_k = headers_lower.get("deposit") or headers_lower.get("credit") or headers_lower.get("cr")

    tx_list = []
    total_w = 0.0
    total_c = 0.0

    for idx, row in enumerate(rows):
        dt = str(row.get(date_k, "")).strip() if date_k else ""
        if not dt:
            dt = datetime.now().strftime("%Y-%m-%d")

        drcr_v = str(row.get(drcr_k, "")).strip().lower() if drcr_k else ""
        amt_v = 0.0
        if amt_k and row.get(amt_k):
            try:
                amt_v = float(str(row[amt_k]).replace(",", "").strip() or 0)
            except ValueError:
                amt_v = 0.0

        w_val = 0.0
        c_val = 0.0

        if debit_k and credit_k and (row.get(debit_k) or row.get(credit_k)):
            try:
                w_val = float(str(row.get(debit_k, 0)).replace(",", "").strip() or 0)
            except ValueError: pass
            try:
                c_val = float(str(row.get(credit_k, 0)).replace(",", "").strip() or 0)
            except ValueError: pass
        elif drcr_v:
            if drcr_v in ("db", "dr", "debit", "withdrawal"):
                w_val = amt_v
            else:
                c_val = amt_v
        else:
            w_val = amt_v

        bal_v = 0.0
        if bal_k and row.get(bal_k):
            try:
                bal_v = float(str(row[bal_k]).replace(",", "").strip() or 0)
            except ValueError: pass

        name_v = str(row.get(name_k, "")).strip() if name_k else ""
        mode_v = str(row.get(mode_k, "")).strip() if mode_k else ""

        desc_parts = []
        if mode_v: desc_parts.append(mode_v)
        if name_v: desc_parts.append(name_v)
        desc = " - ".join(desc_parts) if desc_parts else f"Bank Tx #{idx+1}"

        party_n = name_v if name_v else ("Vendor" if w_val > 0 else "Customer")
        ref_n = f"{mode_v}-{idx+1001}" if mode_v else f"REF-{idx+1001}"

        total_w += w_val
        total_c += c_val

        tx_list.append({
            "id": idx,
            "date": dt,
            "description": desc,
            "reference_number": ref_n,
            "withdrawal": round(w_val, 2),
            "deposit": round(c_val, 2),
            "balance": round(bal_v, 2),
            "party_name": party_n,
            "approved": True,
            "voucher_type": "payment" if w_val > 0 else "receipt"
        })

    first_dt = tx_list[0]["date"] if tx_list else ""
    last_dt = tx_list[-1]["date"] if tx_list else ""

    return {
        "document_type": "bank_statement",
        "bank_name": "Parsed Bank Statement",
        "account_number": f"{len(tx_list)}-Transactions Account",
        "statement_period": f"{first_dt} to {last_dt}",
        "total_amount": round(total_w + total_c, 2),
        "total_withdrawal": round(total_w, 2),
        "total_deposit": round(total_c, 2),
        "total_count": len(tx_list),
        "transactions": tx_list,
        "confidence": {
            "overall": 0.99,
            "bank_name": 1.0,
            "transactions": 1.0
        }
    }

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
    
    file_bytes = await file.read()
    filename = file.filename or "upload.csv"

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
        parsed = parse_uploaded_bank_statement_demo(file_bytes, filename)
        if parsed:
            extracted = parsed
        else:
            extracted = {
                "document_type": "bank_statement",
                "bank_name": "ABC Bank",
                "account_number": "123456789012",
                "statement_period": "01 May 2024 to 31 May 2024",
                "total_amount": 40290.25,
                "transactions": [
                    {
                        "date": "2024-05-02",
                        "description": "Salary Credited by ABC Pvt Ltd",
                        "reference_number": "SAL/0524/001",
                        "withdrawal": 0.00,
                        "deposit": 35000.00,
                        "balance": 60430.75
                    }
                ],
                "confidence": {"overall": 0.98}
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
    corrections = payload.get("corrections") or {}

    doc_found = None
    for d in SEED_DOCUMENTS:
        if d["id"] == doc_id:
            doc_found = d
            break

    if not doc_found:
        raise HTTPException(status_code=404, detail="Document not found")

    if approve:
        doc_found["status"] = "pushed"
        doc_type = doc_found.get("document_type")
        extracted_data = doc_found.get("extracted_data") or {}
        extracted_data.update(corrections)
        doc_found["extracted_data"] = extracted_data

        if doc_type == "bank_statement":
            tx_list = extracted_data.get("transactions") or []
            for tx in tx_list:
                if not tx.get("approved"):
                    continue
                vtype = tx.get("voucher_type")
                if vtype not in ("payment", "receipt"):
                    continue
                amount = float(tx.get("withdrawal") or tx.get("deposit") or 0)
                new_vch = {
                    "id": f"vch-{uuid.uuid4().hex[:8]}",
                    "voucher_number": tx.get("reference_number") or f"{'PAY' if vtype=='payment' else 'REC'}-BS-{uuid.uuid4().hex[:4].upper()}",
                    "voucher_type": vtype,
                    "voucher_date": tx.get("date") or datetime.now().strftime("%Y-%m-%d"),
                    "party_name": tx.get("party_name") or ("Unknown Vendor" if vtype == "payment" else "Unknown Customer"),
                    "subtotal": round(amount / 1.18, 2),
                    "total_cgst": round(amount * 0.09 / 1.18, 2),
                    "total_sgst": round(amount * 0.09 / 1.18, 2),
                    "total_igst": 0.0,
                    "total": amount,
                    "tally_synced": False,
                    "is_cancelled": False,
                    "narration": f"Bank Statement Entry — {tx.get('description')}",
                }
                SEED_VOUCHERS.insert(0, new_vch)
        else:
            vtype_map = {
                "invoice": "sales", "purchase_bill": "purchase",
                "purchase": "purchase", "sales": "sales",
                "export_invoice": "sales", "export": "sales",
                "payment_screenshot": "payment", "other": "journal",
                "lr": "journal", "challan": "journal",
            }
            vtype = vtype_map.get(doc_type, "purchase")
            total = float(extracted_data.get("total_amount") or 0)
            new_vch = {
                "id": f"vch-{uuid.uuid4().hex[:8]}",
                "voucher_number": extracted_data.get("invoice_number") or f"{vtype.upper()}-AI-{uuid.uuid4().hex[:4].upper()}",
                "voucher_type": vtype,
                "voucher_date": extracted_data.get("invoice_date") or datetime.now().strftime("%Y-%m-%d"),
                "party_name": extracted_data.get("party_name") or "Unknown Party",
                "subtotal": round(total / 1.18, 2),
                "total_cgst": round(total * 0.09 / 1.18, 2),
                "total_sgst": round(total * 0.09 / 1.18, 2),
                "total_igst": 0.0,
                "total": total,
                "tally_synced": False,
                "is_cancelled": False,
                "narration": f"AI-extracted from {doc_type}",
            }
            SEED_VOUCHERS.insert(0, new_vch)
    else:
        doc_found["status"] = "failed"

    return {
        "success": True,
        "status": "pushed" if approve else "failed",
        "voucher_id": str(uuid.uuid4()) if approve else None,
    }

# ── Tally ─────────────────────────────────────────────────────────────────────

@app.get("/api/v1/tally/status")
async def tally_status():
    return {"connected": False, "message": "TallyPrime not connected (demo mode)", "pending_sync": 8}

@app.post("/api/v1/tally/test-connection")
async def tally_test(body: dict = {}):
    return {"connected": False, "message": "Demo mode — connect TallyPrime to enable sync"}

# ── Super Admin & Business Tree ────────────────────────────────────────────────

class CreateCompanyReq(BaseModel):
    name: str
    gstin: Optional[str] = None
    plan: str = "starter"
    parent_id: Optional[str] = None
    sub_admin_name: str
    sub_admin_phone: str

@app.get("/api/v1/super-admin/companies")
async def super_admin_get_companies():
    companies = []
    for co_id, co in COMPANIES_DB.items():
        admins = [
            {"name": u["name"], "phone": u["phone"], "role": u["role"], "email": u.get("email", "")}
            for u in USERS_DB.values()
            if u.get("company_id") == co_id
        ]
        companies.append({
            "id": co_id,
            "name": co["name"],
            "gstin": co.get("gstin", ""),
            "plan": co.get("plan", "starter"),
            "parent_id": co.get("parent_id"),
            "db_schema": co.get("db_schema", "co_daynisc"),
            "subscription_start": co.get("subscription_start", "2025-01-01"),
            "subscription_expiry": co.get("subscription_expiry", "2025-12-31"),
            "is_active": co.get("is_active", True),
            "admins": admins
        })
    return {"companies": companies}

@app.post("/api/v1/super-admin/companies")
async def super_admin_create_company(body: CreateCompanyReq):
    co_id = f"co-{len(COMPANIES_DB) + 1:03d}"
    COMPANIES_DB[co_id] = {
        "id": co_id,
        "name": body.name,
        "gstin": body.gstin or "",
        "plan": body.plan,
        "parent_id": body.parent_id,
        "db_schema": f"co_{body.name.lower().replace(' ', '_')}",
        "subscription_start": "2026-06-06",
        "subscription_expiry": "2027-06-06",
        "is_active": True,
    }
    
    u_phone = body.sub_admin_phone.strip()
    u_id = f"user-{len(USERS_DB) + 1:03d}"
    USERS_DB[u_phone] = {
        "id": u_id,
        "phone": u_phone,
        "name": body.sub_admin_name,
        "email": f"{body.sub_admin_name.lower().replace(' ', '')}@daynisc.com",
        "role": "company_admin",
        "company_id": co_id,
    }
    
    OTP_STORE[u_phone] = "989898"
    
    return {
        "success": True,
        "company_id": co_id,
        "sub_admin_id": u_id,
        "message": f"Successfully created company '{body.name}' and sub-admin account."
    }

class CreateUserReq(BaseModel):
    name: str
    phone: str
    role: str
    company_id: str

@app.post("/api/v1/super-admin/users")
async def super_admin_create_user(body: CreateUserReq):
    u_phone = body.phone.strip()
    u_id = f"user-{len(USERS_DB) + 1:03d}"
    USERS_DB[u_phone] = {
        "id": u_id,
        "phone": u_phone,
        "name": body.name,
        "email": f"{body.name.lower().replace(' ', '')}@daynisc.com",
        "role": body.role,
        "company_id": body.company_id,
    }
    
    OTP_STORE[u_phone] = "989898"
    
    return {
        "success": True,
        "user_id": u_id,
        "message": f"Successfully created user '{body.name}'."
    }

class BulkUserItem(BaseModel):
    name: str
    phone: str
    role: str

class CreateUsersBulkReq(BaseModel):
    company_id: str
    users: List[BulkUserItem]

@app.post("/api/v1/super-admin/users/bulk")
async def super_admin_create_users_bulk(body: CreateUsersBulkReq):
    created_count = 0
    for u in body.users:
        u_phone = u.phone.strip()
        u_id = f"user-{len(USERS_DB) + 1:03d}"
        USERS_DB[u_phone] = {
            "id": u_id,
            "phone": u_phone,
            "name": u.name,
            "email": f"{u.name.lower().replace(' ', '')}@daynisc.com",
            "role": u.role,
            "company_id": body.company_id,
        }
        OTP_STORE[u_phone] = "989898"
        created_count += 1
        
    return {
        "success": True,
        "count": created_count,
        "message": f"Successfully created {created_count} users."
    }

# ── Settings ──────────────────────────────────────────────────────────────────


@app.get("/api/v1/settings")
async def get_settings():
    return {"tally_url": "http://localhost:9000", "company_name": "", "ai_enabled": True}

@app.put("/api/v1/settings")
async def save_settings(body: dict):
    return {"success": True, "message": "Settings saved (demo mode)"}

# ── ERP & Tally Integration Endpoints ──────────────────────────────────────────

@app.get("/api/v1/erp/connection/test/tally")
async def test_tally_connection():
    try:
        from tally_connector import TallyConnector
        tc = TallyConnector("http://localhost:9000")
        is_up = await tc.test_connection()
        if is_up:
            return {"connected": True, "message": "Connected to TallyPrime at http://localhost:9000"}
        return {"connected": False, "error": "TallyPrime HTTP server at http://localhost:9000 not responding. Make sure Tally is open and F12 HTTP Port 9000 is enabled."}
    except Exception as e:
        return {"connected": False, "error": str(e)}

@app.post("/api/v1/erp/sync/voucher/{voucher_id}")
async def sync_single_voucher(voucher_id: str):
    found = None
    for v in SEED_VOUCHERS:
        if v["id"] == voucher_id or v["voucher_number"] == voucher_id:
            v["tally_synced"] = True
            v["tally_error"] = None
            found = v
            break
    if not found:
        raise HTTPException(404, detail="Voucher not found")
    return {"success": True, "voucher": found, "message": f"Voucher {found['voucher_number']} synced to TallyPrime!"}

@app.post("/api/v1/erp/sync/bulk")
async def sync_bulk_vouchers():
    synced_count = 0
    for v in SEED_VOUCHERS:
        if not v.get("tally_synced"):
            v["tally_synced"] = True
            v["tally_error"] = None
            synced_count += 1
    return {"success": True, "synced": synced_count, "failed": 0, "message": f"Successfully pushed {synced_count} vouchers to TallyPrime!"}

# ── Banking Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/v1/banking/transactions")
async def get_banking_transactions(limit: int = 2000):
    txs = []
    for d in SEED_DOCUMENTS:
        if d.get("document_type") == "bank_statement":
            t_list = d.get("extracted_data", {}).get("transactions", [])
            for t in t_list:
                txs.append({
                    "id": f"tx-{t.get('id', len(txs))}",
                    "date": t.get("date"),
                    "description": t.get("description"),
                    "reference_number": t.get("reference_number"),
                    "withdrawal": t.get("withdrawal", 0),
                    "deposit": t.get("deposit", 0),
                    "balance": t.get("balance", 0),
                    "party_name": t.get("party_name"),
                    "approved": t.get("approved", True),
                    "voucher_type": t.get("voucher_type", "payment" if t.get("withdrawal", 0) > 0 else "receipt"),
                    "doc_id": d.get("id"),
                    "filename": d.get("original_filename")
                })
    if not txs:
        for v in SEED_VOUCHERS:
            if v.get("voucher_type") in ("payment", "receipt"):
                txs.append({
                    "id": v["id"],
                    "date": v["voucher_date"],
                    "description": v.get("narration") or v["voucher_number"],
                    "reference_number": v["voucher_number"],
                    "withdrawal": v["total"] if v["voucher_type"] == "payment" else 0,
                    "deposit": v["total"] if v["voucher_type"] == "receipt" else 0,
                    "balance": 100000.0,
                    "party_name": v.get("party_name"),
                    "approved": True,
                    "voucher_type": v["voucher_type"]
                })
    return {"items": txs[:limit], "total": len(txs)}

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.0)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and ip != "127.0.0.1" and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        ips = socket.gethostbyname_ex(hostname)[2]
        for ip in ips:
            if ip.startswith("192.168.") or ip.startswith("10."):
                return ip
            if ip.startswith("172."):
                parts = ip.split(".")
                if len(parts) >= 2 and 16 <= int(parts[1]) <= 31:
                    return ip
        for ip in ips:
            if ip != "127.0.0.1" and not ip.startswith("127."):
                return ip
    except Exception:
        pass

    return "localhost"

    return "localhost"


# ── Workflow & Approval Engine ────────────────────────────────────────────────
WORKFLOW_RULES = [
    {"id": "rule-001", "name": "Under ₹10,000 Auto-Approve", "amount_limit": 10000.0, "auto_approve": True, "stages": []},
    {"id": "rule-002", "name": "Purchase Workflow High Value", "amount_limit": 100000.0, "auto_approve": False, "stages": ["accountant", "manager", "finance_head"]}
]

APPROVAL_HISTORY = [
    {"voucher_number": "PUR-3001", "stage": "accountant", "status": "approved", "user": "Ramesh Shah", "comments": "Calculated and matched", "timestamp": "2026-06-28 10:15"},
    {"voucher_number": "PUR-3001", "stage": "manager", "status": "pending", "user": "", "comments": "", "timestamp": ""}
]

@app.get("/api/v1/workflows/rules")
async def get_workflow_rules():
    return WORKFLOW_RULES

@app.post("/api/v1/workflows/rules")
async def create_workflow_rule(body: dict):
    new_rule = {
        "id": f"rule-{len(WORKFLOW_RULES)+1:03d}",
        "name": body.get("name", "New Rule"),
        "amount_limit": float(body.get("amount_limit", 0.0)),
        "auto_approve": bool(body.get("auto_approve", False)),
        "stages": body.get("stages", [])
    }
    WORKFLOW_RULES.append(new_rule)
    return {"success": True, "rule": new_rule}

@app.get("/api/v1/workflows/history/{vch_num}")
async def get_approval_history(vch_num: str):
    return [h for h in APPROVAL_HISTORY if h["voucher_number"] == vch_num]

@app.post("/api/v1/workflows/action")
async def workflow_action(body: dict):
    # Action = approve, reject
    vch_num = body.get("voucher_number")
    stage = body.get("stage", "manager")
    action = body.get("action", "approve")
    comments = body.get("comments", "")
    user = body.get("user", "Demo User")
    
    # Append history log
    new_log = {
        "voucher_number": vch_num,
        "stage": stage,
        "status": "approved" if action == "approve" else "rejected",
        "user": user,
        "comments": comments,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    APPROVAL_HISTORY.append(new_log)
    return {"success": True, "message": f"Voucher {action}d successfully"}


# ── Document Management System (DMS) ──────────────────────────────────────────
DMS_FOLDERS = [
    {"id": "fld-1", "name": "Purchase Invoices", "parent": None},
    {"id": "fld-2", "name": "Purchase Orders", "parent": None},
    {"id": "fld-3", "name": "Delivery Challans", "parent": None},
    {"id": "fld-4", "name": "E-way Bills & Lorry Receipts", "parent": None}
]

DMS_FILES = [
    {"id": "file-1", "name": "invoice_8091.pdf", "folder_id": "fld-1", "type": "Purchase Invoice", "version": "1.0", "ocr_text": "Supreme Plastics Ltd GSTIN 24AAACS4321Z2Z8 Total INR 90000", "size": "142 KB", "created_at": "2026-06-28"},
    {"id": "file-2", "name": "po_90812.pdf", "folder_id": "fld-2", "type": "PO", "version": "2.0", "ocr_text": "PO-2025-2002 Supreme Plastics Steel Rods Quantity 100", "size": "85 KB", "created_at": "2026-06-27"}
]

@app.get("/api/v1/dms/folders")
async def get_dms_folders():
    return {"folders": DMS_FOLDERS, "files": DMS_FILES}

@app.post("/api/v1/dms/upload")
async def dms_upload(folder_id: str = Form(...), file: UploadFile = File(...)):
    new_id = f"file-{len(DMS_FILES)+1}"
    name_lower = file.filename.lower()
    doc_type = "Other Doc"
    if "inv" in name_lower or "bill" in name_lower:
        doc_type = "Purchase Invoice"
    elif "po" in name_lower or "order" in name_lower:
        doc_type = "PO"
    elif "challan" in name_lower:
        doc_type = "Delivery Challan"
    elif "lr" in name_lower or "way" in name_lower:
        doc_type = "E-way / LR Copy"

    new_file = {
        "id": new_id,
        "name": file.filename,
        "folder_id": folder_id,
        "type": doc_type,
        "version": "1.0",
        "ocr_text": f"Extracted text from {file.filename}: Reliance Polymers Pvt Ltd total 120000",
        "size": "95 KB",
        "created_at": datetime.now().strftime("%Y-%m-%d")
    }
    DMS_FILES.append(new_file)
    return {"success": True, "file": new_file}

@app.get("/api/v1/dms/search")
async def dms_search(query: str):
    results = [f for f in DMS_FILES if query.lower() in f["ocr_text"].lower() or query.lower() in f["name"].lower()]
    return results


# ── Portals (Vendor & Customer) ───────────────────────────────────────────────
VENDOR_TICKETS = [
    {"id": "t-1", "vendor": "Reliance Polymers Ltd", "subject": "Payment Delay on INV-9081", "status": "open", "created_at": "2026-06-28"},
    {"id": "t-2", "vendor": "Supreme Plastics Ltd", "subject": "GST mismatch on GSTR-2B", "status": "resolved", "created_at": "2026-06-25"}
]

@app.get("/api/v1/portal/vendor/tickets")
async def get_vendor_tickets():
    return VENDOR_TICKETS

@app.post("/api/v1/portal/vendor/ticket")
async def create_vendor_ticket(body: dict):
    new_t = {
        "id": f"t-{len(VENDOR_TICKETS)+1}",
        "vendor": body.get("vendor", "Demo Supplier"),
        "subject": body.get("subject", "General Query"),
        "status": "open",
        "created_at": datetime.now().strftime("%Y-%m-%d")
    }
    VENDOR_TICKETS.append(new_t)
    return {"success": True, "ticket": new_t}


# ── AI Accounting Copilot Brief & Forecasting ─────────────────────────────────
@app.get("/api/v1/copilot/brief")
async def get_copilot_brief():
    dash = make_dashboard()
    k = dash["kpis"]
    return {
        "greeting": "Good Morning Bhavesh",
        "brief": f"Today you have {k['documents_pending']} documents pending approval, 3 GSTR-2B mismatches, and 2 overdue suppliers. Cash balance is stable at INR 15,24,000.",
        "recommended_actions": [
            {"id": "act-1", "action": "Approve Purchase Voucher #PUR-3001", "type": "approval", "target": "/ai-verification"},
            {"id": "act-2", "action": "Resolve Supreme Plastics GSTR-2B mismatch", "type": "gst", "target": "/gst"},
            {"id": "act-3", "action": "Pay Reliance Polymers (₹1,20,000) - Overdue by 15 days", "type": "payment", "target": "/accounting"}
        ],
        "forecasts": {
            "cash_flow": [
                {"month": "Jul 2026", "inflow": 850000, "outflow": 600000, "net": 250000},
                {"month": "Aug 2026", "inflow": 920000, "outflow": 650000, "net": 270000},
                {"month": "Sep 2026", "inflow": 1100000, "outflow": 720000, "net": 380000}
            ],
            "sales_demand": [
                {"item": "Steel Rods 12mm", "predicted_qty": 350, "unit": "PCS"},
                {"item": "Cement Bags 50kg", "predicted_qty": 1200, "unit": "BAGS"},
                {"item": "PVC Pipe 1inch", "predicted_qty": 480, "unit": "MTR"}
            ],
            "gst_liability": {"month": "June 2026", "payable": 45200.0, "itc_available": 38100.0, "net_payable": 7100.0}
        },
        "insights": [
            "You spent 32% more on logistics and transport this month.",
            "Average profit margin on Cement Bags dropped by 8% due to supplier pricing.",
            "Top customer Sharma Traders delayed invoice payment by an average of 14 days."
        ]
    }


# ── Audit Trail ───────────────────────────────────────────────────────────────
AUDIT_LOGS = [
    {"id": "log-1", "user": "Ramesh Shah", "action": "Edit Voucher PUR-3001", "old_value": "Total: 120000.0", "new_value": "Total: 122000.0", "ip": "192.168.1.45", "browser": "Chrome/Windows", "timestamp": "2026-06-28 15:32:10"},
    {"id": "log-2", "user": "Suresh Kumar", "action": "Adjust Stock Steel Rods", "old_value": "Qty: 120", "new_value": "Qty: 150", "ip": "192.168.1.46", "browser": "Firefox/Mac", "timestamp": "2026-06-27 11:20:15"}
]

@app.get("/api/v1/audit/logs")
async def get_audit_logs():
    return AUDIT_LOGS

@app.post("/api/v1/audit/log")
async def add_audit_log(body: dict):
    new_log = {
        "id": f"log-{len(AUDIT_LOGS)+1}",
        "user": body.get("user", "Demo User"),
        "action": body.get("action", "Voucher Modification"),
        "old_value": body.get("old_value", ""),
        "new_value": body.get("new_value", ""),
        "ip": body.get("ip", "127.0.0.1"),
        "browser": body.get("browser", "BrowserClient"),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    AUDIT_LOGS.append(new_log)
    return {"success": True}


# ── Permission Builder & Custom Roles ─────────────────────────────────────────
ROLE_PERMISSIONS = [
    {"role": "Junior Accountant", "permissions": {"vouchers": ["read", "create"], "ledgers": ["read"], "settings": []}},
    {"role": "GST Officer", "permissions": {"vouchers": ["read"], "ledgers": ["read"], "settings": [], "gst": ["read", "write"]}},
    {"role": "Warehouse Manager", "permissions": {"vouchers": [], "inventory": ["read", "write"], "production": ["read", "write"]}},
    {"role": "Finance Head", "permissions": {"vouchers": ["read", "create", "delete", "approve"], "ledgers": ["read", "write"], "settings": ["read", "write"]}}
]

@app.get("/api/v1/permissions/roles")
async def get_role_permissions():
    return ROLE_PERMISSIONS

@app.put("/api/v1/permissions/roles")
async def update_role_permissions(body: list):
    global ROLE_PERMISSIONS
    ROLE_PERMISSIONS = body
    return {"success": True, "message": "Permissions updated successfully"}


# ── Manufacturing (BOM & MRP Planning) ────────────────────────────────────────
MANUFACTURING_BOM = [
    {"finished_product": "PVC Pipe 1inch", "components": [
        {"name": "HDPE Granules", "qty": "1.2", "unit": "KG"},
        {"name": "Chemical Grade Salt", "qty": "0.15", "unit": "KG"}
    ]},
    {"finished_product": "LED Bulbs 9W", "components": [
        {"name": "LED Chips", "qty": "1", "unit": "PCS"},
        {"name": "Plastic Housing", "qty": "1", "unit": "PCS"},
        {"name": "Driver Circuit", "qty": "1", "unit": "PCS"}
    ]}
]

@app.get("/api/v1/manufacturing/bom")
async def get_manufacturing_bom():
    return MANUFACTURING_BOM


# ── CRM Data ──────────────────────────────────────────────────────────────────
CRM_LEADS = [
    {"id": "ld-1", "name": "Vikas Patel", "company": "Gujarat Gas Agencies", "value": 450000, "status": "Lead", "date": "2026-06-25"},
    {"id": "ld-2", "name": "Rohan Deshmukh", "company": "Pune Steel Corp", "value": 750000, "status": "Quotation Sent", "date": "2026-06-22"},
    {"id": "ld-3", "name": "Pooja Mehta", "company": "Indore Plastics", "value": 1200000, "status": "Follow Up", "date": "2026-06-18"}
]

@app.get("/api/v1/crm/leads")
async def get_crm_leads():
    return CRM_LEADS

@app.post("/api/v1/crm/leads")
async def add_crm_lead(body: dict):
    body["id"] = f"ld-{len(CRM_LEADS)+1}"
    body["date"] = datetime.now().strftime("%Y-%m-%d")
    CRM_LEADS.append(body)
    return {"success": True, "lead": body}

# ── Assets Data ────────────────────────────────────────────────────────────────
ASSETS = [
    {"id": "ast-1", "name": "PVC Extruder Machine", "category": "Plant & Machinery", "cost": 1500000, "purchase_date": "2024-04-10", "depreciation_method": "Straight Line", "rate": 15, "accumulated": 450000},
    {"id": "ast-2", "name": "Dell Office Workstations", "category": "Computers", "cost": 300000, "purchase_date": "2025-06-01", "depreciation_method": "Written Down Value", "rate": 40, "accumulated": 120000},
    {"id": "ast-3", "name": "Executive Conference Table", "category": "Furniture", "cost": 75000, "purchase_date": "2025-09-15", "depreciation_method": "Straight Line", "rate": 10, "accumulated": 7500}
]

@app.get("/api/v1/assets/all")
async def get_assets():
    return ASSETS

# ── Calendar Data ──────────────────────────────────────────────────────────────
CALENDAR_EVENTS = [
    {"id": "cal-1", "title": "GSTR-1 Due Date Filing", "date": "2026-07-11", "type": "GST Due"},
    {"id": "cal-2", "title": "Sharma Traders Payment Overdue", "date": "2026-06-30", "type": "Payment Due"},
    {"id": "cal-3", "title": "BOM Production Run #9081", "date": "2026-06-29", "type": "Production"},
    {"id": "cal-4", "title": "Board Meeting: Q1 Review", "date": "2026-07-05", "type": "Meetings"}
]

@app.get("/api/v1/calendar/events")
async def get_calendar_events():
    return CALENDAR_EVENTS

# ── Marketplace Data ───────────────────────────────────────────────────────────
MARKETPLACE_PLUGINS = [
    {"id": "p-whatsapp", "name": "WhatsApp Cloud API", "desc": "Send automated invoice alerts directly to customer WhatsApp channels.", "installed": True, "price": "Free"},
    {"id": "p-razorpay", "name": "Razorpay Payment Gateway", "desc": "Allow clients to pay invoice receivables directly from the portal.", "installed": False, "price": "₹499/mo"},
    {"id": "p-einvoice", "name": "NIC E-Invoicing API", "desc": "Generate IRS government e-invoices with dynamic QR codes.", "installed": True, "price": "Free"},
    {"id": "p-courier", "name": "Delhivery Shipping API", "desc": "Auto-calculate transport shipping costs and print packing slips.", "installed": False, "price": "₹299/mo"}
]

@app.get("/api/v1/marketplace/plugins")
async def get_marketplace_plugins():
    return MARKETPLACE_PLUGINS

# ── Automation Builder Data ────────────────────────────────────────────────────
AUTOMATION_FLOWS = [
    {"id": "flow-1", "name": "WhatsApp Alert on High Invoice", "trigger": "Invoice Uploaded", "conditions": "Amount > ₹1,00,000", "actions": ["Run AI Extraction", "Start Approval", "Notify WhatsApp"], "active": True},
    {"id": "flow-2", "name": "Low Stock Auto-PO", "trigger": "Stock Below Reorder Level", "conditions": "Qty < 100", "actions": ["Generate Draft PO", "Email Supplier"], "active": False}
]

@app.get("/api/v1/automations/flows")
async def get_automation_flows():
    return AUTOMATION_FLOWS

@app.post("/api/v1/automations/flows")
async def add_automation_flow(body: dict):
    body["id"] = f"flow-{len(AUTOMATION_FLOWS)+1}"
    body["active"] = True
    AUTOMATION_FLOWS.append(body)
    return {"success": True, "flow": body}


@app.get("/health")
@app.get("/api/v1/health")
async def health():
    lan_ip = get_lan_ip()
    return {
        "status": "ok", 
        "mode": "demo", 
        "version": "1.0.0",
        "lan_url": f"http://{lan_ip}:8000/api/v1"
    }


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
