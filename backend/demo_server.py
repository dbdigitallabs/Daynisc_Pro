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
import asyncio
import io
import csv
import hashlib


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
        sub = round(total / 1.18, 2)
        items_cnt = random.randint(1, 3)
        vouchers.append({
            "id": f"vch-{i+1:04d}",
            "voucher_number": f"{'SAL' if vtype=='sales' else 'PUR' if vtype=='purchase' else 'PAY' if vtype=='payment' else 'REC' if vtype=='receipt' else 'JNL'}-{i+3001}",
            "voucher_type": vtype,
            "voucher_date": rand_date(90),
            "party_name": random.choice(COMPANY_NAMES),
            "subtotal": sub,
            "total_cgst": round(sub * 0.09, 2),
            "total_sgst": round(sub * 0.09, 2),
            "total_igst": 0.0,
            "total": total,
            "tally_synced": False,
            "tally_error": None,
            "is_cancelled": False,
            "narration": f"Auto entry for {vtype}",
            "line_items": [
                {
                    "item_name": random.choice(ITEM_NAMES),
                    "quantity": float(random.randint(1, 25)),
                    "rate": round(sub / items_cnt, 2),
                    "gst_rate": 18.0,
                    "taxable_amount": round(sub / items_cnt, 2),
                    "cgst": round(sub * 0.09 / items_cnt, 2),
                    "sgst": round(sub * 0.09 / items_cnt, 2),
                    "igst": 0.0,
                }
                for _ in range(items_cnt)
            ],
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

# ── Seed (Clean state — no static/raw data) ────────────────────────────────────
SEED_ORDERS = []
SEED_PO = []
SEED_VOUCHERS = [
    {
        "id": "vch-c1567762",
        "voucher_number": "SCS/0277/26-27",
        "reference_number": "SCS/0277/26-27",
        "voucher_type": "purchase",
        "voucher_date": "2026-06-06",
        "party_name": "SAI COMPUTER SERVICES",
        "subtotal": 7627.12,
        "total_cgst": 686.44,
        "total_sgst": 686.44,
        "total_igst": 0.0,
        "total": 9000.0,
        "tally_synced": True,
        "is_cancelled": False,
        "narration": "AI-extracted purchase bill SCS/0277/26-27 from SAI COMPUTER SERVICES",
        "line_items": [
            {
                "item_name": "SSD WD 500GB SN5100 NVME BLUE",
                "hsn_code": "8473",
                "quantity": 1.0,
                "unit": "PCS",
                "rate": 7627.12,
                "discount_pct": 0.0,
                "taxable_amount": 7627.12,
                "gst_rate": 18.0,
                "cgst": 686.44,
                "sgst": 686.44,
                "igst": 0.0,
                "total": 9000.0,
                "description_full": "SSD WD 500GB SN5100 NVME BLUE\n254264804872"
            }
        ]
    },
    {
        "id": "vch-rec-223",
        "voucher_number": "REC-223",
        "reference_number": "CHQ-8821",
        "voucher_type": "receipt",
        "voucher_date": datetime.now().strftime("%Y-%m-%d"),
        "party_name": "PATEL ENTERPRISES",
        "subtotal": 76271.19,
        "total_cgst": 6864.40,
        "total_sgst": 6864.40,
        "total_igst": 0.0,
        "total": 90000.0,
        "tally_synced": True,
        "is_cancelled": False,
        "narration": "Payment received against sales invoice SAL-2989",
        "line_items": [{"item_name": "Polypropylene Granules", "quantity": 1.0, "rate": 76271.19, "total": 90000.0}]
    },
    {
        "id": "vch-pay-1102",
        "voucher_number": "PAY-1102",
        "reference_number": "TXN-90218",
        "voucher_type": "payment",
        "voucher_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
        "party_name": "SUPREME PLASTICS",
        "subtotal": 38135.59,
        "total_cgst": 3432.20,
        "total_sgst": 3432.20,
        "total_igst": 0.0,
        "total": 45000.0,
        "tally_synced": True,
        "is_cancelled": False,
        "narration": "Vendor payment clearing balance bill SUP-1092",
        "line_items": [{"item_name": "Industrial Packaging Rolls", "quantity": 1.0, "rate": 38135.59, "total": 45000.0}]
    },
    {
        "id": "vch-rec-109",
        "voucher_number": "REC-109",
        "reference_number": "UPI4190821",
        "voucher_type": "receipt",
        "voucher_date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
        "party_name": "MUMBAI PLASTICS LTD",
        "subtotal": 12711.86,
        "total_cgst": 1144.07,
        "total_sgst": 1144.07,
        "total_igst": 0.0,
        "total": 15000.0,
        "tally_synced": True,
        "is_cancelled": False,
        "narration": "Advance received via UPI for custom molds",
        "line_items": [{"item_name": "Custom Plastic Molds", "quantity": 1.0, "rate": 12711.86, "total": 15000.0}]
    },
    {
        "id": "vch-pay-2005",
        "voucher_number": "PAY-2005",
        "reference_number": "RTGSR8890",
        "voucher_type": "payment",
        "voucher_date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
        "party_name": "RELIANCE POLYMERS",
        "subtotal": 105932.20,
        "total_cgst": 9533.90,
        "total_sgst": 9533.90,
        "total_igst": 0.0,
        "total": 125000.0,
        "tally_synced": True,
        "is_cancelled": False,
        "narration": "Raw polymer shipment payment via RTGS",
        "line_items": [{"item_name": "High Density Polymers", "quantity": 1.0, "rate": 105932.20, "total": 125000.0}]
    }
]
SEED_INVENTORY = []
SEED_PARTIES = [
    {"id": "p-001", "name": "SAI COMPUTER SERVICES", "party_type": "supplier", "receivable": 0, "payable": 9000.0, "gstin": "24APZPP7845N1ZO"},
    {"id": "p-002", "name": "MUMBAI PLASTICS LTD", "party_type": "customer", "receivable": 45000.0, "payable": 0, "gstin": "27AAACM1234F1Z5"},
    {"id": "p-003", "name": "RELIANCE POLYMERS", "party_type": "supplier", "receivable": 0, "payable": 125000.0, "gstin": "24AAACR1234A1Z1"},
    {"id": "p-004", "name": "PATEL ENTERPRISES", "party_type": "customer", "receivable": 90000.0, "payable": 0, "gstin": "24AAACP4567B1Z8"},
    {"id": "p-005", "name": "SUPREME PLASTICS", "party_type": "supplier", "receivable": 0, "payable": 45000.0, "gstin": "24AAACS7890C1Z9"},
    {"id": "p-006", "name": "ABC INDUSTRIES", "party_type": "customer", "receivable": 88118.0, "payable": 0, "gstin": "24AAACA1111D1Z0"},
]
SEED_BANK_STATEMENTS = []
SEED_DOCUMENTS = [
    {
        "id": "doc-c01bc0d2",
        "document_type": "purchase_bill",
        "original_filename": "scaled_1000332955.jpg",
        "status": "pushed",
        "confidence_score": 0.99,
        "language": "en",
        "file_hash": "477bbdcbd80582547e712d8a9b1a9083f299917ec05ed902017a9c6492b1b8b1",
        "is_duplicate": False,
        "created_at": "2026-09-10T15:20:00Z",
        "extracted_data": {
            "document_type": "purchase_bill",
            "language": "en",
            "party_name": "SAI COMPUTER SERVICES",
            "party_gstin": "24APZPP7845N1ZO",
            "party_address": {
                "line1": "B-33,34/G.F., RADHEY SHOPPING MALL, NEAR KHOKHARA CIRCLE, MANINAGAR EAST",
                "city": "AHMEDABAD",
                "state": "Gujarat",
                "pincode": "380008",
                "country": "India"
            },
            "our_gstin": "24APZPP7845N1ZO",
            "consignee_name": "MR. BHAVESH KHIMSURIYA",
            "invoice_number": "SCS/0277/26-27",
            "invoice_date": "2026-06-06",
            "total_amount": 9000.0,
            "subtotal": 7627.12,
            "total_cgst": 686.44,
            "total_sgst": 686.44,
            "total_igst": 0.0,
            "amount_in_words": "INR Nine Thousand Only",
            "confidence": {
                "overall": 1.0,
                "invoice_number": 1.0,
                "party_name": 1.0,
                "total_amount": 1.0,
                "gstin": 1.0,
                "line_items": 1.0
            },
            "line_items": [
                {
                    "item_name": "SSD WD 500GB SN5100 NVME BLUE",
                    "hsn_code": "8473",
                    "quantity": 1,
                    "unit": "PCS",
                    "rate": 7627.12,
                    "discount_pct": 0.0,
                    "taxable_amount": 7627.12,
                    "gst_rate": 18.0,
                    "cgst": 686.44,
                    "sgst": 686.44,
                    "igst": 0.0,
                    "total": 9000.0,
                    "description_full": "SSD WD 500GB SN5100 NVME BLUE\n254264804872"
                }
            ]
        }
    }
]
SEED_PRODUCTION_ORDERS = []

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

@app.get("/api/v1/inventory/items/lookup")
async def lookup_inventory_item(code: str):
    q = code.strip().lower()
    for item in SEED_INVENTORY:
        if item.get("item_code", "").lower() == q or str(item.get("id", "")).lower() == q:
            return {
                "found": True,
                "item": {
                    "id": item["id"],
                    "item_code": item["item_code"],
                    "item_name": item.get("name") or item.get("item_name", ""),
                    "category": item.get("category", "General"),
                    "unit": item.get("unit", "PCS"),
                    "quantity": float(item.get("current_stock", 0)),
                    "reorder_level": float(item.get("reorder_level", 0)),
                    "purchase_rate": float(item.get("purchase_rate", 0)),
                    "selling_rate": float(item.get("selling_rate", 0)),
                    "hsn_code": item.get("hsn_code", ""),
                    "gst_rate": float(item.get("gst_rate", 18.0)),
                    "warehouse": item.get("warehouse", "Main Warehouse")
                }
            }
    return {"found": False, "code": code}

@app.post("/api/v1/inventory/items")
async def create_or_update_inventory_item(body: dict):
    item_code = str(body.get("item_code", "")).strip()
    item_name = str(body.get("item_name", "")).strip()
    if not item_code or not item_name:
        raise HTTPException(status_code=400, detail="item_code and item_name are required")
    
    # Check if item exists to update or insert
    existing = None
    for item in SEED_INVENTORY:
        if item.get("item_code", "").lower() == item_code.lower():
            existing = item
            break
            
    qty = float(body.get("quantity", 0) or 0)
    purchase_rate = float(body.get("purchase_rate", 0) or 0)
    selling_rate = float(body.get("selling_rate", 0) or 0)
    gst_rate = float(body.get("gst_rate", 18.0) or 18.0)
    reorder_level = float(body.get("reorder_level", 10.0) or 10.0)
    category = body.get("category", "General") or "General"
    unit = str(body.get("unit", "PCS") or "PCS").upper()
    hsn = body.get("hsn_code", "")
    warehouse = body.get("warehouse_name", "Main Warehouse") or "Main Warehouse"

    if existing:
        # Increment stock or update
        existing["current_stock"] = float(existing.get("current_stock", 0)) + qty
        if body.get("item_name"):
            existing["name"] = item_name
        if selling_rate > 0:
            existing["selling_rate"] = selling_rate
        if purchase_rate > 0:
            existing["purchase_rate"] = purchase_rate
        existing["low_stock"] = existing["current_stock"] < float(existing.get("reorder_level", 0))
        target = existing
        action = "updated"
    else:
        new_id = f"item-{len(SEED_INVENTORY)+1:04d}"
        new_item = {
            "id": new_id,
            "item_code": item_code,
            "name": item_name,
            "category": category,
            "unit": unit,
            "hsn_code": hsn,
            "gst_rate": gst_rate,
            "purchase_rate": purchase_rate,
            "selling_rate": selling_rate,
            "current_stock": qty,
            "reorder_level": reorder_level,
            "warehouse": warehouse,
            "low_stock": qty < reorder_level,
        }
        SEED_INVENTORY.insert(0, new_item)
        target = new_item
        action = "created"

    return {
        "success": True,
        "action": action,
        "item": {
            "id": target["id"],
            "item_code": target["item_code"],
            "item_name": target["name"],
            "category": target["category"],
            "unit": target["unit"],
            "quantity": float(target["current_stock"]),
            "purchase_rate": float(target["purchase_rate"]),
            "selling_rate": float(target["selling_rate"]),
            "reorder_level": float(target["reorder_level"]),
            "hsn_code": target.get("hsn_code"),
            "gst_rate": float(target.get("gst_rate", 18.0)),
        }
    }

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
    import hashlib
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # 1. Pre-check: Reject if the exact same file was already uploaded
    for d in SEED_DOCUMENTS:
        if d.get("file_hash") == file_hash:
            existing_inv = d.get("extracted_data", {}).get("invoice_number") or "Unknown"
            existing_party = d.get("extracted_data", {}).get("party_name") or "Vendor"
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate bill rejected: This document file has already been uploaded (Invoice '{existing_inv}' from {existing_party})."
            )

    # Attempt real AI extraction via Gemini Vision (sub-5s rapid mode)
    real_ai_succeeded = False
    try:
        from ai_extractor import ai_extractor
        ct = file.content_type or ("application/pdf" if filename.lower().endswith(".pdf") else "image/png")
        real_extracted = await asyncio.wait_for(
            ai_extractor.extract(file_bytes, ct, mapped_type),
            timeout=35.0
        )
        if real_extracted and not real_extracted.get("extraction_error"):
            extracted = real_extracted
            real_ai_succeeded = True
        else:
            print(f"[upload_document] Extraction error reported: {real_extracted.get('extraction_error') if real_extracted else 'empty'}")
    except Exception as e:
        print(f"[upload_document] Rapid fallback engaged ({type(e).__name__}): {e}")

    if not real_ai_succeeded:
        # Clean draft structure based on document type
        if mapped_type == "lr":
            extracted = {
                "lr_number": f"LR-{random.randint(10000,99999)}",
                "invoice_date": datetime.now().strftime("%Y-%m-%d"),
                "transporter_name": "Transporter",
                "vehicle_number": "GJ-01-AB-1234",
                "total_amount": 0.0,
                "confidence": {"lr_number": 0.9, "invoice_date": 0.9, "total_amount": 0.9}
            }
        elif mapped_type == "payment_screenshot":
            extracted = {
                "utr_number": f"UTR{random.randint(1000000000,9999999999)}",
                "invoice_date": datetime.now().strftime("%Y-%m-%d"),
                "payment_mode": "UPI",
                "bank_reference": "Bank Reference",
                "total_amount": 0.0,
                "confidence": {"utr_number": 0.95, "invoice_date": 0.95, "total_amount": 0.9}
            }
        elif mapped_type == "bank_statement":
            parsed = parse_uploaded_bank_statement_demo(file_bytes, filename)
            if parsed:
                extracted = parsed
            else:
                extracted = {
                    "document_type": "bank_statement",
                    "bank_name": "Bank Statement",
                    "account_number": "",
                    "statement_period": datetime.now().strftime("%B %Y"),
                    "total_amount": 0.0,
                    "transactions": [],
                    "confidence": {"overall": 0.9}
                }
        else:
            clean_name = filename.rsplit(".", 1)[0].replace("_", " ").title()
            extracted = {
                "party_name": clean_name if len(clean_name) > 3 else "Vendor Name",
                "invoice_number": f"INV-{random.randint(1000,9999)}",
                "invoice_date": datetime.now().strftime("%Y-%m-%d"),
                "party_gstin": "",
                "vehicle_number": "",
                "total_amount": 0.0,
                "line_items": [
                    {"item_name": "Item Description", "quantity": 1, "unit": "PCS",
                     "rate": 0.0, "gst_rate": 18.0, "total": 0.0}
                ],
                "confidence": {
                    "party_name": 0.90,
                    "invoice_number": 0.90,
                    "invoice_date": 0.95,
                    "total_amount": 0.90
                }
            }

    # 2. Duplicate Check by Extracted Invoice Details
    inv_num = (extracted.get("invoice_number") or "").strip()
    party_name = (extracted.get("party_name") or "").strip()
    tot_amt = extracted.get("total_amount")

    if inv_num and inv_num.upper() not in ("DOC-100", "INV-100", "NONE", "NULL", ""):
        # Check against existing documents in verification queue
        for d in SEED_DOCUMENTS:
            ex_data = d.get("extracted_data") or {}
            ex_inv = (ex_data.get("invoice_number") or "").strip()
            ex_party = (ex_data.get("party_name") or "").strip()
            ex_amt = ex_data.get("total_amount")

            if ex_inv.upper() == inv_num.upper():
                party_label = ex_party or party_name or "this vendor"
                amt_label = f"(₹{ex_amt:.2f})" if ex_amt is not None else ""
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicate bill rejected: Invoice '{inv_num}' from '{party_label}' {amt_label} already exists in the system."
                )

        # Check against posted Tally/ERP accounting vouchers
        for vch in SEED_VOUCHERS:
            v_num = (vch.get("voucher_number") or "").strip()
            v_ref = (vch.get("reference_number") or "").strip()
            if inv_num.upper() in (v_num.upper(), v_ref.upper()):
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicate bill rejected: Invoice '{inv_num}' is already posted in Accounting/Tally vouchers under '{vch.get('party_name')}'."
                )

    new_doc = {
        "id": doc_id,
        "document_type": mapped_type,
        "original_filename": file.filename or f"doc_{random.randint(1000,9999)}.pdf",
        "file_hash": file_hash,
        "status": "extracted",
        "confidence_score": round(extracted.get("confidence", {}).get("overall", 0.95), 4) if real_ai_succeeded else 0.85,
        "language": extracted.get("language", "en"),
        "is_duplicate": False,
        "created_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "extracted_data": extracted
    }
    
    SEED_DOCUMENTS.insert(0, new_doc)
    
    return {
        "id": doc_id,
        "status": "extracted",
        "message": "AI extraction complete via Gemini Vision" if real_ai_succeeded else "Demo mode: AI extraction simulated",
        "party_name": extracted.get("party_name") or extracted.get("transporter_name") or "Extracted Doc",
        "invoice_number": extracted.get("invoice_number") or extracted.get("lr_number") or extracted.get("utr_number") or "DOC-100",
        "total_amount": extracted.get("total_amount"),
        "confidence": new_doc["confidence_score"],
    }

@app.patch("/api/v1/documents/{doc_id}")
async def update_document(doc_id: str, payload: dict):
    doc_found = None
    for d in SEED_DOCUMENTS:
        if d["id"] == doc_id:
            doc_found = d
            break
    if not doc_found:
        raise HTTPException(status_code=404, detail="Document not found")

    extracted = doc_found.setdefault("extracted_data", {})
    for k, v in payload.items():
        if k in ("status", "confidence_score"):
            doc_found[k] = v
        else:
            extracted[k] = v
    return {"message": "Document updated", "document": doc_found}

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
            raw_items = extracted_data.get("line_items") or []
            line_items = []
            for it in raw_items:
                line_items.append({
                    "item_name": it.get("item_name") or "General Item",
                    "hsn_code": str(it.get("hsn_code") or ""),
                    "quantity": float(it.get("quantity") or 1.0),
                    "unit": it.get("unit") or "PCS",
                    "rate": float(it.get("rate") or round(total / 1.18, 2)),
                    "discount_pct": float(it.get("discount_pct") or 0.0),
                    "taxable_amount": float(it.get("taxable_amount") or round(total / 1.18, 2)),
                    "gst_rate": float(it.get("gst_rate") or 18.0),
                    "cgst": float(it.get("cgst") or round(total * 0.09 / 1.18, 2)),
                    "sgst": float(it.get("sgst") or round(total * 0.09 / 1.18, 2)),
                    "igst": float(it.get("igst") or 0.0),
                    "total": float(it.get("total") or total),
                    "description_full": it.get("description_full") or it.get("item_name") or "",
                })
            if not line_items:
                line_items = [{
                    "item_name": extracted_data.get("item_name") or "General Item",
                    "hsn_code": "",
                    "quantity": 1.0,
                    "unit": "PCS",
                    "rate": round(total / 1.18, 2),
                    "discount_pct": 0.0,
                    "taxable_amount": round(total / 1.18, 2),
                    "gst_rate": 18.0,
                    "cgst": round(total * 0.09 / 1.18, 2),
                    "sgst": round(total * 0.09 / 1.18, 2),
                    "igst": 0.0,
                    "total": total,
                    "description_full": "",
                }]

            new_vch = {
                "id": f"vch-{uuid.uuid4().hex[:8]}",
                "voucher_number": extracted_data.get("invoice_number") or f"{vtype.upper()}-AI-{uuid.uuid4().hex[:4].upper()}",
                "reference_number": extracted_data.get("invoice_number") or "",
                "voucher_type": vtype,
                "voucher_date": extracted_data.get("invoice_date") or datetime.now().strftime("%Y-%m-%d"),
                "party_name": extracted_data.get("party_name") or "Unknown Party",
                "subtotal": round(total / 1.18, 2),
                "total_cgst": round(total * 0.09 / 1.18, 2),
                "total_sgst": round(total * 0.09 / 1.18, 2),
                "total_igst": 0.0,
                "total": total,
                "line_items": line_items,
                "tally_synced": False,
                "is_cancelled": False,
                "narration": f"AI-extracted from {doc_type} {extracted_data.get('invoice_number', '')}".strip(),
            }
            SEED_VOUCHERS.insert(0, new_vch)

            # Auto-sync to TallyPrime if connection is active
            tally_synced = False
            tally_message = None
            try:
                from tally_connector import TallyConnector
                t_url = SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
                t_comp = SAVED_COMPANY_SETTINGS.get("tally_company") or "DB Digital Labs"
                tc = TallyConnector(tally_url=t_url, company_name=t_comp)
                conn = await tc.test_connection()
                if conn.get("connected"):
                    sync_payload = {
                        "voucher_date": str(new_vch["voucher_date"]),
                        "reference_number": new_vch["voucher_number"],
                        "party_name": new_vch["party_name"],
                        "narration": new_vch["narration"],
                        "total": float(new_vch["total"]),
                        "amount": float(new_vch["total"]),
                        "line_items": new_vch["line_items"],
                    }
                    if vtype == "purchase":
                        t_res = await tc.push_purchase_voucher(sync_payload)
                    elif vtype == "sales":
                        t_res = await tc.push_sales_voucher(sync_payload)
                    elif vtype == "payment":
                        t_res = await tc.push_payment_voucher(sync_payload)
                    elif vtype == "receipt":
                        t_res = await tc.push_receipt_voucher(sync_payload)
                    else:
                        t_res = None

                    if t_res and t_res.get("success"):
                        new_vch["tally_synced"] = True
                        new_vch["tally_error"] = None
                        tally_synced = True
                        tally_message = f"Voucher {new_vch['voucher_number']} successfully pushed to TallyPrime!"
                    else:
                        err = t_res.get("error") if t_res else "Tally push failed"
                        new_vch["tally_synced"] = False
                        new_vch["tally_error"] = err
                        tally_message = f"Approved, but Tally sync warning: {err}"
                else:
                    tally_message = "Approved! Tally server offline; queued for sync."
            except Exception as e:
                new_vch["tally_synced"] = False
                new_vch["tally_error"] = str(e)
                tally_message = f"Approved! Tally sync failed: {str(e)}"
    else:
        doc_found["status"] = "failed"
        tally_synced = False
        tally_message = None

    return {
        "success": True,
        "status": "pushed" if approve else "failed",
        "voucher_id": new_vch.get("id") if approve and 'new_vch' in locals() else str(uuid.uuid4()) if approve else None,
        "tally_synced": tally_synced,
        "tally_message": tally_message,
    }

# ── Tally ─────────────────────────────────────────────────────────────────────

@app.get("/api/v1/tally/status")
async def tally_status():
    try:
        from tally_connector import TallyConnector
        t_url = SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
        t_comp = SAVED_COMPANY_SETTINGS.get("tally_company") or "DB Digital Labs"
        tc = TallyConnector(tally_url=t_url, company_name=t_comp)
        res = await tc.test_connection()
        pending = sum(1 for v in SEED_VOUCHERS if not v.get("tally_synced"))
        res["pending_sync"] = pending
        return res
    except Exception as e:
        return {"connected": False, "error": str(e), "pending_sync": 0}

@app.post("/api/v1/tally/test-connection")
async def tally_test(body: dict = {}):
    try:
        from tally_connector import TallyConnector
        t_url = body.get("tally_url") or SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
        t_comp = body.get("tally_company") or SAVED_COMPANY_SETTINGS.get("tally_company") or "DB Digital Labs"
        tc = TallyConnector(tally_url=t_url, company_name=t_comp)
        return await tc.test_connection()
    except Exception as e:
        return {"connected": False, "error": str(e)}

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

SAVED_COMPANY_SETTINGS: dict = {
    "active_erp": "tally",  # "tally" | "odoo" | "both"
    "tally_url": "http://localhost:9000",
    "tally_company": "DB Digital Labs",
    "odoo_url": "http://localhost:8069",
    "odoo_db": "",
    "odoo_username": "",
    "odoo_password": "",
    "odoo_auto_post": True,
    "whatsapp_token": "",
    "gemini_key": "",
    "ai_threshold": 0.85,
    "ai_enabled": True,
}

@app.get("/api/v1/settings/company")
@app.get("/api/v1/settings")
async def get_settings():
    return SAVED_COMPANY_SETTINGS

@app.patch("/api/v1/settings/company")
@app.put("/api/v1/settings/company")
@app.put("/api/v1/settings")
@app.patch("/api/v1/settings")
async def save_settings(body: dict):
    SAVED_COMPANY_SETTINGS.update(body)
    return {"success": True, "message": "Settings saved successfully", "settings": SAVED_COMPANY_SETTINGS}

# ── ERP & Tally Integration Endpoints ──────────────────────────────────────────

@app.get("/api/v1/erp/connection/test/tally")
async def test_tally_connection():
    try:
        from tally_connector import TallyConnector
        t_url = SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
        t_comp = SAVED_COMPANY_SETTINGS.get("tally_company") or ""
        tc = TallyConnector(tally_url=t_url, company_name=t_comp)
        result = await tc.test_connection()
        return result
    except Exception as e:
        return {"connected": False, "error": str(e)}

@app.post("/api/v1/erp/sync/voucher/{voucher_id}")
async def sync_single_voucher(voucher_id: str):
    found = None
    for v in SEED_VOUCHERS:
        if v["id"] == voucher_id or v["voucher_number"] == voucher_id:
            found = v
            break
    if not found:
        raise HTTPException(404, detail="Voucher not found")

    from tally_connector import TallyConnector
    t_url = SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
    t_comp = SAVED_COMPANY_SETTINGS.get("tally_company") or ""
    tc = TallyConnector(tally_url=t_url, company_name=t_comp)

    # Validate connectivity before pushing
    conn = await tc.test_connection()
    if not conn.get("connected"):
        err_msg = conn.get("error") or f"Cannot connect to Tally server at {t_url}. Please ensure TallyPrime is running with HTTP Server enabled (Port 9000)."
        found["tally_synced"] = False
        found["tally_error"] = err_msg
        raise HTTPException(status_code=502, detail=err_msg)

    items = found.get("line_items") or [
        {
            "item_name": "General Item",
            "quantity": 1.0,
            "rate": float(found.get("subtotal") or found.get("total") or 0),
            "gst_rate": 18.0,
            "taxable_amount": float(found.get("subtotal") or found.get("total") or 0),
            "cgst": float(found.get("total_cgst") or 0),
            "sgst": float(found.get("total_sgst") or 0),
            "igst": float(found.get("total_igst") or 0),
        }
    ]
    payload = {
        "voucher_date": str(found.get("voucher_date", "")),
        "reference_number": found.get("reference_number") or found.get("voucher_number", ""),
        "party_name": found.get("party_name", ""),
        "narration": found.get("narration", ""),
        "total": float(found.get("total") or 0),
        "amount": float(found.get("total") or 0),
        "line_items": items,
    }

    try:
        vtype = found.get("voucher_type", "sales").lower()
        if vtype == "purchase":
            res = await tc.push_purchase_voucher(payload)
        elif vtype == "sales":
            res = await tc.push_sales_voucher(payload)
        elif vtype == "payment":
            res = await tc.push_payment_voucher(payload)
        elif vtype == "receipt":
            res = await tc.push_receipt_voucher(payload)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported voucher type: {vtype}")

        found["tally_synced"] = True
        found["tally_error"] = None
        return {"success": True, "voucher": found, "tally_response": res, "message": f"Voucher {found['voucher_number']} synced to TallyPrime!"}
    except Exception as e:
        err_msg = str(e).strip() or f"{type(e).__name__}: Tally server timed out"
        found["tally_synced"] = False
        found["tally_error"] = err_msg
        raise HTTPException(status_code=502, detail=f"Tally sync failed: {err_msg}")

@app.post("/api/v1/erp/sync/bulk")
async def sync_bulk_vouchers():
    from tally_connector import TallyConnector
    t_url = SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
    t_comp = SAVED_COMPANY_SETTINGS.get("tally_company") or ""
    tc = TallyConnector(tally_url=t_url, company_name=t_comp)

    conn = await tc.test_connection()
    if not conn.get("connected"):
        err_msg = conn.get("error") or f"Cannot connect to Tally server at {t_url}. Please ensure TallyPrime is running with HTTP Server enabled."
        raise HTTPException(status_code=502, detail=err_msg)

    synced_count = 0
    failed_count = 0
    errors = []

    pending = [v for v in SEED_VOUCHERS if not v.get("tally_synced")]
    for v in pending:
        items = v.get("line_items") or [
            {
                "item_name": "General Item",
                "quantity": 1.0,
                "rate": float(v.get("subtotal") or v.get("total") or 0),
                "gst_rate": 18.0,
                "taxable_amount": float(v.get("subtotal") or v.get("total") or 0),
                "cgst": float(v.get("total_cgst") or 0),
                "sgst": float(v.get("total_sgst") or 0),
                "igst": float(v.get("total_igst") or 0),
            }
        ]
        payload = {
            "voucher_date": str(v.get("voucher_date", "")),
            "reference_number": v.get("reference_number") or v.get("voucher_number", ""),
            "party_name": v.get("party_name", ""),
            "narration": v.get("narration", ""),
            "total": float(v.get("total") or 0),
            "amount": float(v.get("total") or 0),
            "line_items": items,
        }
        try:
            vtype = v.get("voucher_type", "sales").lower()
            if vtype == "purchase":
                await tc.push_purchase_voucher(payload)
            elif vtype == "sales":
                await tc.push_sales_voucher(payload)
            elif vtype == "payment":
                await tc.push_payment_voucher(payload)
            elif vtype == "receipt":
                await tc.push_receipt_voucher(payload)
            else:
                continue

            v["tally_synced"] = True
            v["tally_error"] = None
            synced_count += 1
        except Exception as e:
            failed_count += 1
            err_msg = str(e).strip() or f"{type(e).__name__}: Tally server timed out"
            v["tally_error"] = err_msg
            errors.append({"voucher_number": v.get("voucher_number"), "error": err_msg[:200]})

    return {
        "success": True,
        "synced": synced_count,
        "failed": failed_count,
        "total": len(pending),
        "errors": errors[:5],
        "message": f"Sync completed. Synced: {synced_count}, Failed: {failed_count}"
    }

# ── Odoo ERP Integration Endpoints ──────────────────────────────────────────

@app.get("/api/v1/erp/connection/test/odoo")
@app.post("/api/v1/erp/connection/test/odoo")
async def test_odoo_connection(body: dict = None):
    try:
        from odoo_connector import OdooConnector
        creds = body or {}
        o_url = creds.get("odoo_url") or SAVED_COMPANY_SETTINGS.get("odoo_url") or "http://localhost:8069"
        o_db = creds.get("odoo_db") or SAVED_COMPANY_SETTINGS.get("odoo_db") or ""
        o_user = creds.get("odoo_username") or SAVED_COMPANY_SETTINGS.get("odoo_username") or ""
        o_pass = creds.get("odoo_password") or SAVED_COMPANY_SETTINGS.get("odoo_password") or ""
        
        connector = OdooConnector(url=o_url, db=o_db, username=o_user, password=o_pass)
        return connector.test_connection()
    except Exception as e:
        return {"connected": False, "error": str(e), "message": f"Odoo test failed: {str(e)}"}

@app.post("/api/v1/erp/sync/odoo/{voucher_id}")
async def sync_single_voucher_odoo(voucher_id: str):
    found = None
    for v in SEED_VOUCHERS:
        if v["id"] == voucher_id or v["voucher_number"] == voucher_id:
            found = v
            break
    if not found:
        raise HTTPException(404, detail="Voucher not found")

    from odoo_connector import OdooConnector
    o_url = SAVED_COMPANY_SETTINGS.get("odoo_url") or "http://localhost:8069"
    o_db = SAVED_COMPANY_SETTINGS.get("odoo_db") or ""
    o_user = SAVED_COMPANY_SETTINGS.get("odoo_username") or ""
    o_pass = SAVED_COMPANY_SETTINGS.get("odoo_password") or ""

    connector = OdooConnector(url=o_url, db=o_db, username=o_user, password=o_pass)
    conn_res = connector.test_connection()
    if not conn_res.get("connected") or not conn_res.get("authenticated"):
        err_msg = conn_res.get("error") or conn_res.get("message") or "Cannot authenticate with Odoo. Check Settings."
        found["odoo_synced"] = False
        found["odoo_error"] = err_msg
        raise HTTPException(status_code=502, detail=err_msg)

    items = found.get("line_items") or [
        {
            "name": f"Accounting Entry {found.get('voucher_number')}",
            "quantity": 1.0,
            "rate": float(found.get("subtotal") or found.get("total") or 0.0),
        }
    ]

    payload = {
        "voucher_number": found.get("voucher_number", ""),
        "reference_number": found.get("reference_number") or found.get("voucher_number", ""),
        "voucher_date": str(found.get("voucher_date", "")),
        "party_name": found.get("party_name", "Valued Partner"),
        "party_gstin": found.get("party_gstin", ""),
        "narration": found.get("narration", ""),
        "total": float(found.get("total") or 0.0),
        "subtotal": float(found.get("subtotal") or found.get("total") or 0.0),
        "line_items": items,
    }

    try:
        res = connector.sync_voucher(payload, found.get("voucher_type"))
        found["odoo_synced"] = True
        found["odoo_ref"] = res.get("odoo_ref")
        found["odoo_error"] = None
        return {
            "success": True,
            "voucher": found,
            "odoo_response": res,
            "message": f"Voucher {found['voucher_number']} synced to Odoo ({res.get('odoo_ref')})!"
        }
    except Exception as e:
        err_msg = str(e).strip()
        found["odoo_synced"] = False
        found["odoo_error"] = err_msg
        raise HTTPException(status_code=502, detail=f"Odoo sync failed: {err_msg}")

@app.post("/api/v1/erp/sync/odoo/bulk")
async def sync_bulk_vouchers_odoo():
    from odoo_connector import OdooConnector
    o_url = SAVED_COMPANY_SETTINGS.get("odoo_url") or "http://localhost:8069"
    o_db = SAVED_COMPANY_SETTINGS.get("odoo_db") or ""
    o_user = SAVED_COMPANY_SETTINGS.get("odoo_username") or ""
    o_pass = SAVED_COMPANY_SETTINGS.get("odoo_password") or ""

    connector = OdooConnector(url=o_url, db=o_db, username=o_user, password=o_pass)
    conn_res = connector.test_connection()
    if not conn_res.get("connected") or not conn_res.get("authenticated"):
        err_msg = conn_res.get("error") or conn_res.get("message") or "Cannot authenticate with Odoo. Check Settings."
        raise HTTPException(status_code=502, detail=err_msg)

    synced_count = 0
    failed_count = 0
    errors = []

    pending = [v for v in SEED_VOUCHERS if not v.get("odoo_synced")]
    for v in pending:
        items = v.get("line_items") or [
            {
                "name": f"Accounting Entry {v.get('voucher_number')}",
                "quantity": 1.0,
                "rate": float(v.get("subtotal") or v.get("total") or 0.0),
            }
        ]
        payload = {
            "voucher_number": v.get("voucher_number", ""),
            "reference_number": v.get("reference_number") or v.get("voucher_number", ""),
            "voucher_date": str(v.get("voucher_date", "")),
            "party_name": v.get("party_name", "Valued Partner"),
            "party_gstin": v.get("party_gstin", ""),
            "narration": v.get("narration", ""),
            "total": float(v.get("total") or 0.0),
            "subtotal": float(v.get("subtotal") or v.get("total") or 0.0),
            "line_items": items,
        }
        try:
            res = connector.sync_voucher(payload, v.get("voucher_type"))
            v["odoo_synced"] = True
            v["odoo_ref"] = res.get("odoo_ref")
            v["odoo_error"] = None
            synced_count += 1
        except Exception as e:
            failed_count += 1
            err_msg = str(e).strip()
            v["odoo_error"] = err_msg
            errors.append({"voucher_number": v.get("voucher_number"), "error": err_msg[:200]})

    return {
        "success": True,
        "synced": synced_count,
        "failed": failed_count,
        "total": len(pending),
        "errors": errors[:5],
        "message": f"Odoo sync completed. Synced: {synced_count}, Failed: {failed_count}"
    }

@app.post("/api/v1/erp/sync/auto/{voucher_id}")
async def sync_auto_voucher(voucher_id: str):
    active_erp = (SAVED_COMPANY_SETTINGS.get("active_erp") or "tally").lower()
    results = {}
    if active_erp in ("tally", "both"):
        try:
            t_res = await sync_single_voucher(voucher_id)
            results["tally"] = t_res
        except Exception as e:
            results["tally"] = {"success": False, "error": str(e)}
    if active_erp in ("odoo", "both"):
        try:
            o_res = await sync_single_voucher_odoo(voucher_id)
            results["odoo"] = o_res
        except Exception as e:
            results["odoo"] = {"success": False, "error": str(e)}
    return {"success": True, "active_erp": active_erp, "results": results}

@app.get("/api/v1/erp/status")
async def get_erp_overall_status():
    tally_pending = len([v for v in SEED_VOUCHERS if not v.get("tally_synced")])
    tally_synced = len([v for v in SEED_VOUCHERS if v.get("tally_synced")])
    tally_errors = len([v for v in SEED_VOUCHERS if v.get("tally_error")])

    odoo_pending = len([v for v in SEED_VOUCHERS if not v.get("odoo_synced")])
    odoo_synced = len([v for v in SEED_VOUCHERS if v.get("odoo_synced")])
    odoo_errors = len([v for v in SEED_VOUCHERS if v.get("odoo_error")])

    return {
        "active_erp": SAVED_COMPANY_SETTINGS.get("active_erp", "tally"),
        "tally": {"pending": tally_pending, "synced": tally_synced, "errors": tally_errors},
        "odoo": {"pending": odoo_pending, "synced": odoo_synced, "errors": odoo_errors},
        "pending": tally_pending if SAVED_COMPANY_SETTINGS.get("active_erp") != "odoo" else odoo_pending,
        "synced": tally_synced if SAVED_COMPANY_SETTINGS.get("active_erp") != "odoo" else odoo_synced,
        "errors": tally_errors if SAVED_COMPANY_SETTINGS.get("active_erp") != "odoo" else odoo_errors,
    }

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

# ── Bank Automation & AI Reconciliation Endpoints ───────────────────────────

from bank_recon_service import BankReconService

def _ensure_initial_bank_statement():
    if not SEED_BANK_STATEMENTS:
        raw_rows = BankReconService._generate_fallback_statement_rows()
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(raw_rows[0].keys()))
        writer.writeheader()
        writer.writerows(raw_rows)
        csv_bytes = buf.getvalue().encode("utf-8")
        parsed_txns = BankReconService.parse_statement_file(csv_bytes, "HDFC_Statement_June2026.csv")
        recon = BankReconService.run_reconciliation(parsed_txns, SEED_VOUCHERS, SEED_PARTIES)
        closing_bal = parsed_txns[-1]["balance"] if parsed_txns else 1739118.0
        book_credits = sum(float(v.get("total") or 0) for v in SEED_VOUCHERS if v.get("voucher_type") in ("receipt", "sales"))
        book_debits = sum(float(v.get("total") or 0) for v in SEED_VOUCHERS if v.get("voucher_type") in ("payment", "purchase"))
        book_bal = book_credits - book_debits
        brs = BankReconService.calculate_brs(
            closing_bal,
            book_bal,
            recon.get("unpresented_vouchers", []),
            [],
            [t for t in recon.get("missing_in_books", []) if t.get("deposit", 0) > 0],
            [t for t in recon.get("missing_in_books", []) if t.get("withdrawal", 0) > 0],
            "HDFC Bank Current A/c - 50200012345"
        )
        SEED_BANK_STATEMENTS.append({
            "id": "stmt-hdfc-01",
            "filename": "HDFC_Current_Account_June2026.csv",
            "bank_account": "HDFC Bank Current A/c - 50200012345",
            "file_hash": hashlib.sha256(csv_bytes).hexdigest(),
            "created_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_lines": len(parsed_txns),
            "opening_balance": 1845000.0,
            "closing_balance": closing_bal,
            "total_withdrawal": round(sum(t["withdrawal"] for t in parsed_txns), 2),
            "total_deposit": round(sum(t["deposit"] for t in parsed_txns), 2),
            "transactions": parsed_txns,
            "reconciliation": recon,
            "brs": brs
        })

_ensure_initial_bank_statement()

class MatchStatementReq(BaseModel):
    statement_id: str
    txn_id: str
    voucher_id: str

class CreateVoucherFromTxnReq(BaseModel):
    statement_id: str
    txn_id: str
    party_name: Optional[str] = None
    voucher_type: Optional[str] = None
    account_ledger: Optional[str] = None
    narration: Optional[str] = None
    sync_to_tally: bool = True

class BulkCreateVouchersReq(BaseModel):
    statement_id: str
    sync_to_tally: bool = True

@app.post("/api/v1/bank/statements/import")
async def import_bank_statement(
    file: UploadFile = File(...),
    bank_account: str = Form("HDFC Bank Current A/c - 50200012345"),
    allow_reimport: bool = Form(False)
):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    f_hash = BankReconService.compute_file_hash(file_bytes)

    if not allow_reimport:
        for st in SEED_BANK_STATEMENTS:
            if st.get("file_hash") == f_hash:
                return {
                    "success": False,
                    "is_duplicate": True,
                    "message": f"Duplicate statement rejected: File '{st.get('filename')}' was already imported on {st.get('created_at')}.",
                    "statement_id": st["id"],
                    "statement": st
                }

    filename = file.filename or "statement.csv"
    txns = BankReconService.parse_statement_file(file_bytes, filename, file.content_type)
    if not txns:
        raise HTTPException(status_code=400, detail=f"Could not parse valid bank statement rows from '{filename}'. Please verify format.")

    existing_fps = set()
    for st in SEED_BANK_STATEMENTS:
        for t in st.get("transactions", []):
            if t.get("fingerprint"):
                existing_fps.add(t["fingerprint"])

    new_txns = []
    duplicate_count = 0
    for t in txns:
        if t["fingerprint"] in existing_fps:
            duplicate_count += 1
            t["is_duplicate_txn"] = True
        else:
            t["is_duplicate_txn"] = False
            new_txns.append(t)

    effective_txns = new_txns if new_txns else txns
    recon = BankReconService.run_reconciliation(effective_txns, SEED_VOUCHERS, SEED_PARTIES)

    closing_bal = effective_txns[-1]["balance"] if effective_txns else 0.0
    opening_bal = effective_txns[0]["balance"] - effective_txns[0]["deposit"] + effective_txns[0]["withdrawal"] if effective_txns else 0.0

    book_credits = sum(float(v.get("total") or 0) for v in SEED_VOUCHERS if v.get("voucher_type") in ("receipt", "sales"))
    book_debits = sum(float(v.get("total") or 0) for v in SEED_VOUCHERS if v.get("voucher_type") in ("payment", "purchase"))
    book_bal = book_credits - book_debits

    brs = BankReconService.calculate_brs(
        closing_bal,
        book_bal,
        recon.get("unpresented_vouchers", []),
        [],
        [t for t in recon.get("missing_in_books", []) if t.get("deposit", 0) > 0],
        [t for t in recon.get("missing_in_books", []) if t.get("withdrawal", 0) > 0],
        bank_account
    )

    stmt_id = f"stmt-{uuid.uuid4().hex[:8]}"
    stmt_record = {
        "id": stmt_id,
        "filename": filename,
        "bank_account": bank_account,
        "file_hash": f_hash,
        "created_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_lines": len(effective_txns),
        "duplicate_lines_skipped": duplicate_count,
        "opening_balance": round(opening_bal, 2),
        "closing_balance": round(closing_bal, 2),
        "total_withdrawal": round(sum(t.get("withdrawal", 0) for t in effective_txns), 2),
        "total_deposit": round(sum(t.get("deposit", 0) for t in effective_txns), 2),
        "transactions": effective_txns,
        "reconciliation": recon,
        "brs": brs
    }
    SEED_BANK_STATEMENTS.insert(0, stmt_record)

    return {
        "success": True,
        "statement_id": stmt_id,
        "message": f"Successfully imported '{filename}' with {len(effective_txns)} transactions ({duplicate_count} duplicate lines skipped).",
        "statement": stmt_record
    }

@app.get("/api/v1/bank/statements")
async def list_bank_statements():
    _ensure_initial_bank_statement()
    items = []
    for s in SEED_BANK_STATEMENTS:
        items.append({
            "id": s["id"],
            "filename": s["filename"],
            "bank_account": s["bank_account"],
            "created_at": s["created_at"],
            "total_lines": s["total_lines"],
            "closing_balance": s.get("closing_balance", 0),
            "total_deposit": s.get("total_deposit", 0),
            "total_withdrawal": s.get("total_withdrawal", 0),
            "exact_matched_count": s.get("reconciliation", {}).get("stats", {}).get("exact_matched_count", 0),
            "missing_books_count": s.get("reconciliation", {}).get("stats", {}).get("missing_books_count", 0),
            "match_rate_pct": s.get("reconciliation", {}).get("stats", {}).get("match_rate_pct", 0),
        })
    return {"items": items, "total": len(items)}

@app.get("/api/v1/bank/reconcile/{statement_id}")
async def get_reconciliation_details(statement_id: str):
    _ensure_initial_bank_statement()
    stmt = None
    for s in SEED_BANK_STATEMENTS:
        if s["id"] == statement_id:
            stmt = s
            break
    if not stmt:
        stmt = SEED_BANK_STATEMENTS[0] if SEED_BANK_STATEMENTS else None

    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    txns = stmt.get("transactions", [])
    recon = BankReconService.run_reconciliation(txns, SEED_VOUCHERS, SEED_PARTIES)

    closing_bal = stmt.get("closing_balance", 0.0)
    book_credits = sum(float(v.get("total") or 0) for v in SEED_VOUCHERS if v.get("voucher_type") in ("receipt", "sales"))
    book_debits = sum(float(v.get("total") or 0) for v in SEED_VOUCHERS if v.get("voucher_type") in ("payment", "purchase"))
    book_bal = book_credits - book_debits

    brs = BankReconService.calculate_brs(
        closing_bal,
        book_bal,
        recon.get("unpresented_vouchers", []),
        [],
        [t for t in recon.get("missing_in_books", []) if t.get("deposit", 0) > 0],
        [t for t in recon.get("missing_in_books", []) if t.get("withdrawal", 0) > 0],
        stmt.get("bank_account", "HDFC Bank Current A/c")
    )
    stmt["reconciliation"] = recon
    stmt["brs"] = brs

    return {
        "statement_id": stmt["id"],
        "filename": stmt["filename"],
        "bank_account": stmt["bank_account"],
        "opening_balance": stmt.get("opening_balance", 0),
        "closing_balance": closing_bal,
        "reconciliation": recon,
        "brs": brs
    }

@app.post("/api/v1/bank/reconcile/match")
async def match_statement_txn(body: MatchStatementReq):
    stmt = next((s for s in SEED_BANK_STATEMENTS if s["id"] == body.statement_id), None)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    txn = next((t for t in stmt.get("transactions", []) if str(t["id"]) == body.txn_id), None)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found in statement")

    vch = next((v for v in SEED_VOUCHERS if v["id"] == body.voucher_id), None)
    if not vch:
        raise HTTPException(status_code=404, detail="Voucher not found")

    txn["recon_status"] = "manually_matched"
    txn["matched_voucher_id"] = vch["id"]

    return {
        "success": True,
        "message": f"Successfully matched statement txn '{txn.get('reference_number')}' with voucher '{vch.get('voucher_number')}'.",
        "txn": txn,
        "voucher": vch
    }

@app.post("/api/v1/bank/reconcile/create-voucher")
async def create_voucher_from_statement_txn(body: CreateVoucherFromTxnReq):
    stmt = next((s for s in SEED_BANK_STATEMENTS if s["id"] == body.statement_id), None)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    txn = next((t for t in stmt.get("transactions", []) if str(t["id"]) == body.txn_id), None)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    ai_analysis = txn.get("ai_analysis") or BankReconService.analyze_narration(
        txn.get("narration", ""),
        float(txn.get("withdrawal", 0)),
        float(txn.get("deposit", 0)),
        SEED_PARTIES
    )

    party = (body.party_name or ai_analysis.get("identified_party") or "Bank Party").strip()
    v_type = (body.voucher_type or ai_analysis.get("recommended_voucher_type") or ("payment" if txn.get("withdrawal", 0) > 0 else "receipt")).lower()
    amount = float(txn.get("amount") or txn.get("deposit") or txn.get("withdrawal") or 0)
    ref = txn.get("reference_number") or f"TXN-{uuid.uuid4().hex[:6].upper()}"

    vch_num = f"{'PAY' if v_type == 'payment' else 'REC' if v_type == 'receipt' else 'CON' if v_type == 'contra' else 'JNL'}-BNK-{uuid.uuid4().hex[:4].upper()}"
    new_vch = {
        "id": f"vch-{uuid.uuid4().hex[:8]}",
        "voucher_number": vch_num,
        "reference_number": ref,
        "voucher_type": v_type,
        "voucher_date": txn.get("date") or datetime.now().strftime("%Y-%m-%d"),
        "party_name": party,
        "subtotal": round(amount / 1.18, 2) if v_type in ("purchase", "sales") else amount,
        "total_cgst": 0.0,
        "total_sgst": 0.0,
        "total_igst": 0.0,
        "total": amount,
        "tally_synced": False,
        "is_cancelled": False,
        "narration": f"Bank Recon: {txn.get('narration', '')}".strip(),
        "line_items": [{
            "item_name": body.account_ledger or ai_analysis.get("suggested_ledger") or "Direct Bank Entry",
            "quantity": 1.0,
            "rate": amount,
            "total": amount
        }]
    }

    SEED_VOUCHERS.insert(0, new_vch)
    txn["recon_status"] = "voucher_created"
    txn["matched_voucher_id"] = new_vch["id"]

    tally_pushed = False
    tally_msg = None
    if body.sync_to_tally:
        try:
            from tally_connector import TallyConnector
            t_url = SAVED_COMPANY_SETTINGS.get("tally_url") or "http://localhost:9000"
            t_comp = SAVED_COMPANY_SETTINGS.get("tally_company") or "DB Digital Labs"
            tc = TallyConnector(tally_url=t_url, company_name=t_comp)
            conn = await tc.test_connection()
            if conn.get("connected"):
                sync_payload = {
                    "voucher_date": str(new_vch["voucher_date"]),
                    "reference_number": new_vch["voucher_number"],
                    "party_name": new_vch["party_name"],
                    "narration": new_vch["narration"],
                    "total": float(new_vch["total"]),
                    "amount": float(new_vch["total"]),
                    "line_items": new_vch["line_items"],
                }
                if v_type == "payment":
                    t_res = await tc.push_payment_voucher(sync_payload)
                elif v_type == "receipt":
                    t_res = await tc.push_receipt_voucher(sync_payload)
                elif v_type == "purchase":
                    t_res = await tc.push_purchase_voucher(sync_payload)
                elif v_type == "sales":
                    t_res = await tc.push_sales_voucher(sync_payload)
                else:
                    t_res = None

                if t_res and t_res.get("success"):
                    new_vch["tally_synced"] = True
                    tally_pushed = True
                    tally_msg = f"Voucher {new_vch['voucher_number']} pushed to TallyPrime!"
        except Exception as e:
            tally_msg = f"Tally sync error: {e}"

    return {
        "success": True,
        "voucher": new_vch,
        "tally_synced": tally_pushed,
        "tally_message": tally_msg,
        "message": f"Created {v_type.upper()} voucher {new_vch['voucher_number']} for {party} (₹{amount:,.2f})!"
    }

@app.post("/api/v1/bank/reconcile/bulk-create-vouchers")
async def bulk_create_vouchers_from_statement(body: BulkCreateVouchersReq):
    stmt = next((s for s in SEED_BANK_STATEMENTS if s["id"] == body.statement_id), None)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    created = []
    for txn in stmt.get("transactions", []):
        if txn.get("recon_status") in ("missing_in_books", None) and not txn.get("matched_voucher_id"):
            ai_analysis = txn.get("ai_analysis") or BankReconService.analyze_narration(
                txn.get("narration", ""),
                float(txn.get("withdrawal", 0)),
                float(txn.get("deposit", 0)),
                SEED_PARTIES
            )
            party = ai_analysis.get("identified_party") or "Bank Account Party"
            v_type = ai_analysis.get("recommended_voucher_type") or ("payment" if txn.get("withdrawal", 0) > 0 else "receipt")
            amount = float(txn.get("amount") or txn.get("deposit") or txn.get("withdrawal") or 0)

            vch_num = f"{'PAY' if v_type == 'payment' else 'REC' if v_type == 'receipt' else 'CON'}-BNK-{uuid.uuid4().hex[:4].upper()}"
            new_vch = {
                "id": f"vch-{uuid.uuid4().hex[:8]}",
                "voucher_number": vch_num,
                "reference_number": txn.get("reference_number") or "",
                "voucher_type": v_type,
                "voucher_date": txn.get("date") or datetime.now().strftime("%Y-%m-%d"),
                "party_name": party,
                "subtotal": amount,
                "total_cgst": 0.0,
                "total_sgst": 0.0,
                "total_igst": 0.0,
                "total": amount,
                "tally_synced": False,
                "is_cancelled": False,
                "narration": f"Auto Bank BRS: {txn.get('narration', '')}".strip(),
                "line_items": [{
                    "item_name": ai_analysis.get("suggested_ledger") or "Direct Bank Entry",
                    "quantity": 1.0,
                    "rate": amount,
                    "total": amount
                }]
            }
            SEED_VOUCHERS.insert(0, new_vch)
            txn["recon_status"] = "voucher_created"
            txn["matched_voucher_id"] = new_vch["id"]
            created.append(new_vch)

    return {
        "success": True,
        "created_count": len(created),
        "vouchers": created,
        "message": f"Successfully generated {len(created)} accounting vouchers from statement entries."
    }

@app.get("/api/v1/bank/brs-report/{statement_id}")
async def get_brs_report(statement_id: str):
    stmt = next((s for s in SEED_BANK_STATEMENTS if s["id"] == statement_id), None)
    if not stmt:
        stmt = SEED_BANK_STATEMENTS[0] if SEED_BANK_STATEMENTS else None
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    return stmt.get("brs", {})

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


@app.get("/api/v1/ai-assistant/deep-learning/overview")
async def get_demo_deep_learning_overview():
    return {
        "architecture": {
            "system": "DAYNISK AI-ERP Ecosystem",
            "layers": [
                {
                    "name": "ERP Core Layer",
                    "modules": ["Sales", "Inventory", "Production", "Purchase", "Finance", "Reports"],
                    "data_feed": "PostgreSQL Real-time CDC & Event Stream"
                },
                {
                    "name": "Deep Learning AI Layer",
                    "modules": [
                        "Demand Forecasting (LSTM)",
                        "Sales Prediction (Transformer)",
                        "Production Optimizer (Deep RL)",
                        "Purchase Forecaster (Neural Additive)",
                        "QC Vision (CNN/ResNet-50)",
                        "Expense Prediction (Prophet/GRU)",
                        "Customer Churn (XGBoost/Neural)",
                        "Intelligent Analysis (Gemini GenAI)",
                        "OCR Document AI (LayoutLMv3)",
                        "Anomaly Detector (Autoencoder + Isolation Forest)"
                    ],
                    "inference_engine": "Daynisk Neural Runtime v2.4"
                },
                {
                    "name": "AI Insights & Automation Layer",
                    "outputs": ["Live Daynisk Dashboard", "ERP Voucher Auto-fill", "WhatsApp Alerts", "Tally Auto-sync"]
                }
            ]
        },
        "modules": [
            {
                "id": "inventory",
                "module_name": "Inventory",
                "dl_use": "Demand Forecasting",
                "model_type": "Stacked Bi-LSTM + Attention",
                "accuracy": "96.4%",
                "status": "active",
                "latency_ms": 14,
                "example": "Predict how many products will be needed next month",
                "predictions": [
                    {"sku": "SKU-PL-101", "item_name": "HDPE Polymer Granules (Grade A)", "current_stock": 1400, "unit": "KG", "predicted_demand": 3850, "safety_buffer": 500, "reorder_recommended": True, "reorder_qty": 2950},
                    {"sku": "SKU-ST-204", "item_name": "Mild Steel Angles 50x50x6mm", "current_stock": 450, "unit": "PCS", "predicted_demand": 380, "safety_buffer": 100, "reorder_recommended": False, "reorder_qty": 0},
                    {"sku": "SKU-PK-880", "item_name": "Corrugated Boxes 5-Ply Large", "current_stock": 620, "unit": "BOX", "predicted_demand": 2400, "safety_buffer": 300, "reorder_recommended": True, "reorder_qty": 2080}
                ]
            },
            {
                "id": "sales",
                "module_name": "Sales",
                "dl_use": "Sales Prediction",
                "model_type": "Temporal Fusion Transformer (TFT)",
                "accuracy": "94.8%",
                "status": "active",
                "latency_ms": 19,
                "example": "Predict next month's sales revenue and volume",
                "predictions": {
                    "next_month_projected": 4850000.0,
                    "growth_rate_pct": 14.5,
                    "confidence_interval": [4520000.0, 5180000.0],
                    "top_growth_categories": [
                        {"category": "Industrial Polymers", "growth": "+22.4%"},
                        {"category": "Structural Hardware", "growth": "+11.8%"}
                    ]
                }
            },
            {
                "id": "production",
                "module_name": "Production",
                "dl_use": "Production Forecasting",
                "model_type": "Deep Reinforcement Learning (PPO)",
                "accuracy": "95.2%",
                "status": "active",
                "latency_ms": 25,
                "example": "Predict required production quantity & batch scheduling",
                "predictions": [
                    {"batch_id": "BATCH-2026-08A", "product": "Masterbatch Colorant Black", "recommended_batch_qty": 4200, "unit": "KG", "est_machine_hours": 36, "bottleneck_risk": "Low"},
                    {"batch_id": "BATCH-2026-08B", "product": "Extrusion Profile P-12", "recommended_batch_qty": 1850, "unit": "MTR", "est_machine_hours": 22, "bottleneck_risk": "Medium (Line 2 Maintenance)"}
                ]
            },
            {
                "id": "purchasing",
                "module_name": "Purchasing",
                "dl_use": "Purchase Prediction",
                "model_type": "Multi-Variate GRU Price Forecaster",
                "accuracy": "93.1%",
                "status": "active",
                "latency_ms": 16,
                "example": "Suggest when and how much raw material to buy with price trends",
                "predictions": [
                    {"material": "Virgin Polypropylene Resin", "supplier": "Reliance Industries", "suggested_po_date": "2026-08-25", "recommended_qty": 5000, "unit": "KG", "est_savings": "₹34,000 (Price hike predicted next week)"},
                    {"material": "Calcium Carbonate Filler", "supplier": "Gujarat Minerals", "suggested_po_date": "2026-09-02", "recommended_qty": 2000, "unit": "KG", "est_savings": "₹8,500"}
                ]
            },
            {
                "id": "qc",
                "module_name": "Quality Control",
                "dl_use": "Image Classification & Defect Detection",
                "model_type": "YOLOv8 + ResNet-50 Vision Classifier",
                "accuracy": "98.7%",
                "status": "active",
                "latency_ms": 32,
                "example": "Detect defects in products from camera images and visual feeds",
                "predictions": [
                    {"sample_id": "QC-CAM-901", "item": "Finished Poly Tubing 32mm", "status": "PASSED", "defect_type": "None", "confidence": 0.994, "defect_score": 0.006},
                    {"sample_id": "QC-CAM-902", "item": "Molded Joint Fitting", "status": "DEFECT_DETECTED", "defect_type": "Surface Micro-Fracture / Flash", "confidence": 0.962, "defect_score": 0.962}
                ]
            },
            {
                "id": "expenses",
                "module_name": "Expenses",
                "dl_use": "Expense Prediction",
                "model_type": "Neural Additive Time-Series Model",
                "accuracy": "92.6%",
                "status": "active",
                "latency_ms": 15,
                "example": "Predict future utility, freight, and operating expenses",
                "predictions": {
                    "next_month_projected_opex": 685000.0,
                    "breakdown": [
                        {"category": "Logistics & Transport", "predicted": 240000.0, "trend": "+12% (Diesel impact)"},
                        {"category": "Electricity & Power", "predicted": 185000.0, "trend": "+4% (Peak load)"},
                        {"category": "Machine Maintenance", "predicted": 95000.0, "trend": "-8% (Preventive)"},
                        {"category": "Administrative & Misc", "predicted": 165000.0, "trend": "Flat"}
                    ]
                }
            },
            {
                "id": "customers",
                "module_name": "Customers",
                "dl_use": "Customer Behavior & Churn Prediction",
                "model_type": "Deep Gradient Boosted Trees (XGBoost + DNN)",
                "accuracy": "91.9%",
                "status": "active",
                "latency_ms": 12,
                "example": "Predict which customers may stop buying or delay payments",
                "predictions": [
                    {"customer_name": "Apex Engineering Works", "churn_risk": "High (78%)", "risk_factors": "Order frequency dropped 60% in last 45 days", "recommended_action": "Schedule account manager follow-up + offering 3% volume rebate"},
                    {"customer_name": "Surat Packaging Hub", "churn_risk": "Low (12%)", "risk_factors": "Consistent weekly orders", "recommended_action": "Offer credit limit expansion for peak festive quarter"}
                ]
            },
            {
                "id": "reports",
                "module_name": "Reports",
                "dl_use": "Intelligent Analysis & Auto-Narratives",
                "model_type": "Gemini 2.5 Flash Neural Reasoning",
                "accuracy": "97.5%",
                "status": "active",
                "latency_ms": 850,
                "example": "Automatically explain why sales/profit changed with root causes",
                "predictions": {
                    "executive_narrative": "Net gross margin improved by 3.8% this month driven by a favorable shift toward high-margin Masterbatch grades (+24% volume) combined with bulk procurement discounts locked with primary resin suppliers."
                }
            },
            {
                "id": "ocr",
                "module_name": "OCR",
                "dl_use": "Document Understanding",
                "model_type": "LayoutLMv3 + Vision-Language Transformer",
                "accuracy": "99.1%",
                "status": "active",
                "latency_ms": 1200,
                "example": "Read invoices, bills, LR receipts automatically across English, Hindi, and Gujarati",
                "predictions": {
                    "docs_processed_today": 38,
                    "auto_reconciled_pct": 92.1,
                    "avg_extraction_time_sec": 1.4
                }
            },
            {
                "id": "anomaly",
                "module_name": "Anomaly Detection",
                "dl_use": "Detect Unusual Transactions & Phantom Movements",
                "model_type": "Deep Autoencoder + Isolation Forest",
                "accuracy": "97.8%",
                "status": "active",
                "latency_ms": 18,
                "example": "Identify suspicious/unusual sales, pricing outliers, or inventory movements",
                "predictions": [
                    {"flag_id": "ANO-8841", "type": "Pricing Anomaly", "severity": "HIGH", "detail": "Sales invoice #INV-4921 issued with 38% discount on Grade A Polymer (Historical max: 12%)", "status": "Under Review"},
                    {"flag_id": "ANO-8842", "type": "Inventory Discrepancy", "severity": "MEDIUM", "detail": "Unscheduled outward movement of 350 KG Mild Steel without linked delivery voucher", "status": "Flagged"}
                ]
            }
        ]
    }

@app.post("/api/v1/ai-assistant/deep-learning/run-prediction")
async def run_demo_dl_prediction(payload: dict):
    mod = payload.get("module", "inventory").lower()
    params = payload.get("params") or {}

    if mod == "inventory":
        sku = params.get("sku", "SKU-PL-101")
        item_name = params.get("item_name", "HDPE Polymer Granules (Grade A)")
        current_stock = int(params.get("current_stock", 1400))
        unit = params.get("unit", "KG")

        base_demand = 3850 if "PL" in sku else (2400 if "PK" in sku else 420)
        daily_trend = [round(base_demand / 30 * (1 + 0.15 * (i % 7 - 3) / 3), 1) for i in range(1, 31)]
        predicted_demand = sum(daily_trend)
        safety_buffer = round(predicted_demand * 0.15)
        reorder_qty = max(0, round(predicted_demand + safety_buffer - current_stock))
        stockout_risk = 84.5 if reorder_qty > 0 else 4.2

        return {
            "status": "success",
            "module": "inventory",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Bi-LSTM + Temporal Attention v2.4",
            "accuracy": "96.4%",
            "inference_result": {
                "sku": sku,
                "item_name": item_name,
                "current_stock": current_stock,
                "unit": unit,
                "predicted_demand_30d": round(predicted_demand),
                "daily_velocity_avg": round(predicted_demand / 30, 1),
                "safety_buffer": safety_buffer,
                "reorder_needed": reorder_qty > 0,
                "recommended_reorder_qty": reorder_qty,
                "stockout_risk_pct": stockout_risk,
                "recommended_order_date": "2026-08-23",
                "daily_forecast_curve": daily_trend,
                "erp_action_available": "Create Purchase Requisition"
            }
        }

    elif mod == "sales":
        category = params.get("category", "All Products")
        horizon = int(params.get("horizon_months", 1))
        base_sales = 4850000.0 * horizon

        return {
            "status": "success",
            "module": "sales",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Temporal Fusion Transformer (TFT)",
            "accuracy": "94.8%",
            "inference_result": {
                "category": category,
                "horizon_months": horizon,
                "predicted_revenue": base_sales,
                "projected_growth_pct": 14.5,
                "lower_bound_95": round(base_sales * 0.93),
                "upper_bound_95": round(base_sales * 1.07),
                "monthly_projections": [
                    {"month": "Month +1", "revenue": round(base_sales / horizon * 1.0), "growth": "+14.5%"},
                    {"month": "Month +2", "revenue": round(base_sales / horizon * 1.08), "growth": "+18.2%"},
                    {"month": "Month +3", "revenue": round(base_sales / horizon * 1.15), "growth": "+22.0%"}
                ][:horizon],
                "top_drivers": [
                    {"factor": "Polymer Bulk Demand", "impact": "+32% contribution"},
                    {"factor": "Regional Distributor Expansion (Gujarat & MH)", "impact": "+18% contribution"}
                ],
                "erp_action_available": "Update Sales Targets"
            }
        }

    elif mod == "production":
        batch_product = params.get("product", "Masterbatch Colorant Black")
        target_qty = int(params.get("target_qty", 4200))
        unit = params.get("unit", "KG")

        return {
            "status": "success",
            "module": "production",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Deep Reinforcement Learning (PPO)",
            "accuracy": "95.2%",
            "inference_result": {
                "product": batch_product,
                "optimal_batch_size": target_qty,
                "unit": unit,
                "est_machine_hours": round(target_qty / 115, 1),
                "recommended_line": "Extrusion Line #2 (High Efficiency)",
                "line_utilization_pct": 92.4,
                "bottleneck_risk": "Low (Next preventative maintenance in 14 days)",
                "raw_material_readiness": "100% in stock",
                "recommended_shift": "Shift A + Shift B (Continuous)",
                "erp_action_available": "Dispatch Production Work Order"
            }
        }

    elif mod == "purchasing":
        material = params.get("material", "Virgin Polypropylene Resin")
        supplier = params.get("supplier", "Reliance Industries")

        return {
            "status": "success",
            "module": "purchasing",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Multi-Variate GRU Price Forecaster",
            "accuracy": "93.1%",
            "inference_result": {
                "material": material,
                "preferred_supplier": supplier,
                "price_trend_forecast": "Bullish (+4.5% price spike predicted in 7-10 days)",
                "optimal_po_date": "2026-08-25 (Within 48 hours)",
                "recommended_order_volume": "5,000 KG",
                "est_cost_savings": "₹34,000 vs delaying by 2 weeks",
                "supplier_credit_terms": "30 Days Net",
                "erp_action_available": "Auto-Create Purchase Order"
            }
        }

    elif mod == "qc":
        camera = params.get("camera_id", "QC-CAM-01 (Conveyor Line)")
        sim_defect = params.get("simulate_defect", False)

        if sim_defect:
            status_text = "DEFECT_DETECTED"
            defect_type = "Surface Micro-Fracture / Flash"
            conf = 0.968
            coords = {"x": 142, "y": 85, "w": 48, "h": 32}
            action_text = "Quarantine Batch for Re-inspection"
        else:
            status_text = "PASSED"
            defect_type = "None (Within ISO tolerance)"
            conf = 0.994
            coords = None
            action_text = "Approve QC Digital Certificate"

        return {
            "status": "success",
            "module": "qc",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "YOLOv8 + ResNet-50 Vision CNN",
            "accuracy": "98.7%",
            "inference_result": {
                "camera_id": camera,
                "inspection_status": status_text,
                "defect_type": defect_type,
                "confidence_score": conf,
                "defect_coordinates": coords,
                "inspected_items_last_hr": 240,
                "pass_rate_pct": 98.3,
                "erp_action_available": action_text
            }
        }

    elif mod == "expenses":
        return {
            "status": "success",
            "module": "expenses",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Neural Additive Time-Series (NAM)",
            "accuracy": "92.6%",
            "inference_result": {
                "projected_total_opex": 685000.0,
                "projected_capex": 120000.0,
                "category_breakdown": [
                    {"category": "Logistics & Transport", "amount": 240000.0, "pct": 35.0, "status": "Warning: Diesel inflation (+12%)"},
                    {"category": "Electricity & Power", "amount": 185000.0, "pct": 27.0, "status": "Normal (Peak load managed)"},
                    {"category": "Machine Maintenance", "amount": 95000.0, "pct": 13.9, "status": "Optimized (-8%)"},
                    {"category": "Admin & Operating Overheads", "amount": 165000.0, "pct": 24.1, "status": "Stable"}
                ],
                "recommended_cost_saving": "Consolidate Surat-Ahmedabad dispatch routes to save ₹28,000/mo.",
                "erp_action_available": "Apply Route Optimization"
            }
        }

    elif mod == "customers":
        customer = params.get("customer_name", "Apex Engineering Works")
        return {
            "status": "success",
            "module": "customers",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Deep Gradient Boosted Trees (XGBoost + DNN)",
            "accuracy": "91.9%",
            "inference_result": {
                "customer_name": customer,
                "churn_risk_level": "HIGH",
                "churn_probability_pct": 78.4,
                "health_score": 42,
                "key_risk_signals": [
                    "Order frequency dropped 60% in past 45 days",
                    "Average invoice payment delayed from 12 days to 34 days",
                    "No inquiry logged for new fiscal quarter"
                ],
                "recommended_retention_action": "Issue automated 3% volume rebate voucher + schedule Sales Head call",
                "erp_action_available": "Send WhatsApp Retention Offer"
            }
        }

    elif mod == "reports":
        return {
            "status": "success",
            "module": "reports",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Gemini 2.5 Flash Neural Reasoning",
            "accuracy": "97.5%",
            "inference_result": {
                "analysis_title": "Automated Executive Variance Report (August 2026)",
                "executive_narrative": "Operating gross margins expanded by +3.8% MoM. Root-cause analysis indicates this gain was driven by a 24% volume surge in high-margin Masterbatch grades combined with ₹34,000 procurement savings locked via forward polymer booking.",
                "key_kpis": [
                    {"name": "Gross Margin", "change": "+3.8%", "sentiment": "positive"},
                    {"name": "Order Cycle Time", "change": "-18%", "sentiment": "positive"},
                    {"name": "Freight Cost / MT", "change": "+4.2%", "sentiment": "caution"}
                ],
                "strategic_takeaway": "Maintain raw material price locks into Q3 to preserve 18.5% blended EBIT margin.",
                "erp_action_available": "Download Executive PDF Summary"
            }
        }

    elif mod == "ocr":
        return {
            "status": "success",
            "module": "ocr",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "LayoutLMv3 + Multi-Lingual Transformer",
            "accuracy": "99.1%",
            "inference_result": {
                "pipeline_status": "ONLINE",
                "supported_languages": ["English", "Hindi", "Gujarati"],
                "avg_processing_latency_sec": 1.4,
                "token_confidence_score": 0.992,
                "recent_extraction_summary": {
                    "doc_type": "Tax Invoice (GST Format)",
                    "party_name_match": "Supreme Polymers Pvt Ltd (100% match)",
                    "gstin_extracted": "24AABCS1429B1Z8 (Verified on GST Portal)",
                    "line_items_parsed": 6,
                    "tax_reconciliation": "CGST 9% + SGST 9% Verified"
                },
                "erp_action_available": "Sync Directly to Tally Voucher"
            }
        }

    elif mod == "anomaly":
        return {
            "status": "success",
            "module": "anomaly",
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Deep Autoencoder + Isolation Forest",
            "accuracy": "97.8%",
            "inference_result": {
                "scanner_status": "Continuous CDC Stream Active",
                "anomalies_detected_count": 2,
                "anomalies": [
                    {
                        "flag_id": "ANO-8841",
                        "type": "Unapproved Heavy Discount",
                        "severity": "HIGH",
                        "voucher": "INV-4921",
                        "detail": "Invoice issued with 38% special discount (Max policy threshold: 15%)",
                        "risk_score": 0.94,
                        "action_required": "Super-Admin Approval Required"
                    },
                    {
                        "flag_id": "ANO-8842",
                        "type": "Phantom Inventory Outward",
                        "severity": "MEDIUM",
                        "voucher": "STK-ADJ-109",
                        "detail": "Outward stock movement of 350 KG Mild Steel with missing dispatch note",
                        "risk_score": 0.76,
                        "action_required": "Verify Warehouse Gate Register"
                    }
                ],
                "erp_action_available": "Quarantine Flagged Vouchers"
            }
        }

    else:
        return {
            "status": "success",
            "module": mod,
            "timestamp": "2026-08-19T12:30:00Z",
            "model": "Daynisk Neural Runtime v2.4",
            "accuracy": "95.0%",
            "inference_result": {
                "message": f"Inference for {mod} completed successfully.",
                "status": "ACTIVE"
            }
        }

@app.post("/api/v1/ai-assistant/deep-learning/apply-action")
async def apply_demo_dl_erp_action(payload: dict):
    action = payload.get("action", "Execute")
    module = payload.get("module", "ai")
    return {
        "status": "applied",
        "action": action,
        "module": module,
        "message": f" Action '{action}' successfully executed in ERP Core for module '{module.upper()}'.",
        "reference_id": f"ACT-{module[:3].upper()}-9901",
        "timestamp": "2026-08-19T12:32:00Z"
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
