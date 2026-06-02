# AI ERP & Business Automation Platform

> **AI-first ERP ecosystem for Indian SMEs, factories, manufacturers, traders, and distributors.**
> Upload any business document → AI reads it → ERP entry created → Tally synced. Automatically.

---

## 🗂 Complete File Structure

```
erp-platform/
│
├── flutter_app/                    ← Flutter Mobile App (iOS + Android)
│   ├── lib/
│   │   ├── main.dart               ← App entry point
│   │   ├── core/
│   │   │   ├── theme.dart          ← Industrial design system tokens
│   │   │   ├── app_router.dart     ← GoRouter navigation
│   │   │   └── api_client.dart     ← Dio HTTP client + JWT
│   │   ├── features/
│   │   │   ├── auth/               ← OTP login screens
│   │   │   ├── dashboard/          ← KPI dashboard screen
│   │   │   ├── document_scan/      ← Camera scan + upload
│   │   │   ├── inventory/          ← Stock management
│   │   │   ├── production/         ← BOM + production orders
│   │   │   ├── sales/              ← Quotations + invoices
│   │   │   ├── purchase/           ← PO + GRN + bills
│   │   │   ├── transport/          ← LR + dispatch tracking
│   │   │   └── accounting/         ← Ledger + vouchers
│   │   └── shared/
│   │       ├── widgets/            ← Reusable UI components
│   │       ├── models/             ← Freezed data models
│   │       └── providers/          ← Riverpod state providers
│   └── pubspec.yaml                ← Dependencies
│
├── backend/                        ← Python FastAPI Backend
│   ├── main.py                     ← FastAPI app + all routers
│   ├── Dockerfile                  ← Multi-stage Docker build
│   ├── requirements.txt            ← Python dependencies
│   ├── shared/
│   │   ├── config.py               ← All env var settings
│   │   ├── database.py             ← Async SQLAlchemy + multi-tenant
│   │   ├── tasks.py                ← Celery async task queue
│   │   ├── auth.py                 ← JWT + OTP auth middleware
│   │   ├── storage.py              ← AWS S3 file operations
│   │   └── middleware.py           ← Tenant + audit middleware
│   └── services/
│       ├── document_service/
│       │   ├── routes.py           ← Upload, verify, list APIs
│       │   └── ai_extractor.py     ← Gemini Vision AI extraction
│       ├── accounting_service/
│       │   └── routes.py           ← Vouchers, ledger, outstanding
│       ├── inventory_service/
│       │   └── routes.py           ← Stock movements, valuation
│       ├── production_service/
│       │   └── routes.py           ← BOM, production orders
│       ├── erp_connector/
│       │   └── tally_connector.py  ← TallyPrime XML integration
│       ├── gst_service/
│       │   └── routes.py           ← e-Invoice, e-Way Bill, GSTR
│       └── whatsapp_service/
│           └── routes.py           ← WA webhook + messaging
│
├── web_dashboard/                  ← React Web ERP Dashboard
│   ├── src/
│   │   ├── App.tsx                 ← Routes + QueryClient setup
│   │   ├── store/
│   │   │   ├── apiClient.ts        ← Axios + auto JWT refresh
│   │   │   └── authStore.ts        ← Zustand auth state
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── DashboardLayout.tsx  ← Sidebar nav shell
│   │   └── pages/
│   │       ├── DashboardPage.tsx   ← KPI + charts dashboard
│   │       ├── AIVerificationPage.tsx   ← Review AI extractions
│   │       ├── AccountingPage.tsx  ← Vouchers + ledger
│   │       ├── InventoryPage.tsx   ← Stock management
│   │       ├── ProductionPage.tsx  ← Production orders + BOM
│   │       ├── SalesPage.tsx       ← Orders + invoices
│   │       ├── PurchasePage.tsx    ← PO + bills
│   │       ├── TransportPage.tsx   ← LR + dispatch
│   │       ├── GSTPage.tsx         ← Returns + e-Invoice
│   │       └── ERPSyncPage.tsx     ← Tally sync monitor
│   └── package.json
│
├── database/
│   └── schema.sql                  ← Complete PostgreSQL schema
│                                      (multi-tenant, all tables, triggers)
│
├── deployment/
│   └── k8s-manifests.yaml          ← Kubernetes (EKS) deployment
│
├── docker-compose.yml              ← Full local stack
└── .env.example                    ← All environment variables
```

---

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- Google Gemini API key (for OCR)
- WhatsApp Business API token (for WA automation)

### 1. Clone and configure
```bash
git clone https://github.com/yourorg/ai-erp-platform
cd ai-erp-platform
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start all services
```bash
docker-compose up -d
```

### 3. Run database migrations
```bash
docker-compose exec api alembic upgrade head
```

### 4. Access
| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:3000 |
| API Docs | http://localhost:8000/api/docs |
| Flower (Celery) | http://localhost:5555 |
| PostgreSQL | localhost:5432 |

---

## 🏗 Architecture Summary

```
Mobile App (Flutter)  +  Web Dashboard (React)
              │
         API Gateway (Nginx/Kong)
              │
    FastAPI Microservices (Python)
              │
    ┌─────────┴──────────────┐
    │                        │
Celery Workers           PostgreSQL
(AI, ERP, WA)         (Multi-tenant)
    │                        │
    │                     Redis
    │
AI Engine (Gemini Vision)
    │
ERP Connector Layer
    │
TallyPrime / Zoho / ERPNext / Odoo
```

---

## 📱 Flutter App Features

| Module | Features |
|--------|----------|
| Document Scan | Camera, gallery, PDF, WhatsApp import |
| AI Extraction | Real-time OCR + Gemini Vision |
| Dashboard | KPI cards, alerts, quick actions |
| Inventory | Live stock, barcode scan, movements |
| Production | BOM, orders, shift tracking |
| Sales | Quotation, invoice, WhatsApp share |
| Purchase | PO, GRN, bill scan |
| Transport | LR upload, dispatch, POD |
| Accounting | Ledger, outstanding, vouchers |

**Tech:** Flutter 3.x · Riverpod · GoRouter · Dio · Hive · FCM

---

## 🌐 Web Dashboard Features

| Page | Features |
|------|----------|
| Dashboard | Sales/purchase charts, KPIs, alerts |
| AI Verification | Review extractions, 1-click approve |
| Accounting | Voucher list, ledger, reconciliation |
| Inventory | Stock levels, valuation, movements |
| Production | BOM editor, order tracking, reports |
| GST | GSTR data, e-Invoice, e-Way Bill |
| ERP Sync | Tally sync status, retry failed |
| Settings | Company, users, ERP config |

**Tech:** React 18 · TypeScript · Zustand · React Query · Recharts

---

## 🤖 AI Pipeline

```
Document Upload
     │
S3 Storage
     │
Celery AI Worker
     │
Gemini 1.5 Pro (Vision)
     │
Entity Extraction (EN/HI/GU)
     │
Confidence Scoring (0.0 – 1.0)
     │
Duplicate Check
     │
confidence ≥ 0.85 ?
  YES → Auto-create ERP Entry → Tally Sync
  NO  → Human Verification Queue
```

---

## 🔗 Tally Integration

1. Enable HTTP server in TallyPrime: `F12 → Advanced Config → Enable HTTP`
2. Set port to `9000` (default)
3. Configure company name in platform settings
4. Platform auto-generates Tally XML for every voucher
5. Vouchers are pushed on creation (or retried if Tally is offline)

**Supported vouchers:** Purchase · Sales · Payment · Receipt · Stock Journal

---

## 🧾 GST Features

- GSTR-1 / GSTR-3B / GSTR-9 data generation (JSON for portal upload)
- e-Invoice (IRN generation via IRP API)
- e-Way Bill (auto-generate for invoices > ₹50,000)
- ITC reconciliation (GSTR-2B vs purchase register)
- CGST/SGST split for intrastate, IGST for interstate

---

## 📱 WhatsApp Automation

| Feature | How it works |
|---------|-------------|
| Invoice import | Customer forwards invoice → AI extracts → ERP entry |
| Payment proof | UPI/NEFT screenshot → OCR → auto-reconcile |
| Payment reminders | Daily cron → overdue customers → WA template |
| Dispatch notification | LR created → notify customer with vehicle no. |
| Stock alerts | Low stock → notify warehouse manager |

---

## 🔐 Security

- **Auth:** OTP (MSG91 SMS) + JWT (15-min access + 30-day refresh)
- **Tenancy:** PostgreSQL schema-per-company isolation
- **RBAC:** 7 roles with granular permissions
- **Audit:** Every write logged with before/after values
- **Storage:** Documents encrypted at rest in S3
- **TLS:** Enforced via Nginx/ALB

---

## 📦 SaaS Plans

| Plan | Price | Users | AI Scans | Key Features |
|------|-------|-------|----------|-------------|
| Starter | ₹999/mo | 3 | 100 | Basic accounting, 1 warehouse |
| SME | ₹2,499/mo | 10 | 500 | Tally sync, e-Invoice, 3 warehouses |
| Factory | ₹4,999/mo | 25 | 2,000 | Production BOM, all ERPs |
| Enterprise | Custom | ∞ | ∞ | Multi-company, SAP, SLA 99.9% |

---

## 🗺 Roadmap

- **Phase 1** (M1-2): Flutter app + Gemini OCR + basic extraction
- **Phase 2** (M3-4): Tally integration + stock automation
- **Phase 3** (M5-6): Full GST cycle + e-Invoice + e-Way Bill
- **Phase 4** (M7-9): Production BOM + Transport LR + WhatsApp
- **Phase 5** (M10-12): Zoho/ERPNext/Odoo + AI self-learning
- **Phase 6** (M13-18): AI business assistant + demand forecasting

---

## 📞 Support

Built for Indian SMEs · Supports English, Hindi, Gujarati
Designed for: Manufacturing · Plastic/Masterbatch · Traders · Warehouses · Transport
