# Daynisc Pro — AI-Powered Accounting & ERP Automation Platform

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Vision-8E75B2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![TallyPrime](https://img.shields.io/badge/TallyPrime-XML_HTTP_Sync-004A80?style=flat-square)](https://tallysolutions.com)
[![Electron](https://img.shields.io/badge/Electron-Windows_Desktop-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)

**Repository:** [https://github.com/dbdigitallabs/Daynisc_Pro.git](https://github.com/dbdigitallabs/Daynisc_Pro.git)

---

## Overview

**Daynisc Pro** is an autonomous AI-driven automation platform built for accounting teams, manufacturers, and distributors. It streamlines tedious manual accounting workflows into three core modules:

1. **AI Document Extraction & Verification** — Instant multimodal OCR extraction for invoices, bills, and receipts using Google Gemini Vision.
2. **Direct ERP Sync (TallyPrime & Odoo)** — One-click voucher push directly to TallyPrime (Port 9000 XML HTTP) and Odoo ERP.
3. **Smart Bank Automation & BRS** — Automated bank statement parsing, transaction categorisation, and ledger reconciliation.

Available as both a **Cloud Web Dashboard** and a **Windows Desktop Application** (`.exe` / portable `.zip`).

---

## Key Active Features

### 1. AI Document Ingestion & Verification
- **Multimodal OCR (Gemini Vision):** Ingests PDF, PNG, JPG, and WEBP documents (Tax Invoices, Purchase Bills, e-Way bills, Lorry Receipts).
- **Line-Item Extraction:** Automatically extracts vendor names, GSTINs, invoice numbers, dates, HSN/SAC codes, tax slabs (CGST, SGST, IGST), quantities, and grand totals.
- **Split-Screen Verification Studio:** Interactive side-by-side document viewer (with zoom, rotate, and pan) and an editable verification form with confidence indicators.
- **Batch Processing:** Drag-and-drop multiple files simultaneously with real-time extraction queues.

### 2. ERP Sync Hub (TallyPrime & Odoo)
- **TallyPrime Native HTTP XML Sync:** Automatically compiles valid Tally XML envelopes and posts them directly to TallyPrime on `http://localhost:9000`.
- **Automatic Ledger Mapping:** Maps supplier names, customer accounts, and tax ledgers automatically before submission.
- **Odoo Connector:** Supports synchronizing approved bills and invoices to Odoo ERP via JSON-RPC / XML-RPC.
- **Sync Audit Log:** Real-time sync logs with retry queues for failed transmissions and XML payload inspection.

### 3. Bank Automation & BRS
- **Multi-Bank Statement Parsing:** Import CSV or Excel statements from major Indian banks (HDFC, ICICI, SBI, Axis, Kotak, etc.).
- **Smart Categorisation:** Classifies transactions into Receipts, Payments, and Contra entries based on narration patterns and party identifiers.
- **Rule-Based BRS Engine:** Cross-references bank transactions with open ERP vouchers using reference numbers, UTR, cheque numbers, and fuzzy name matching.
- **One-Click Reconcile:** Reconcile matches with High, Medium, and Low confidence scores, and generate BRS summaries on demand.

### 4. Windows Desktop App & Web Dashboard
- **Modern Dashboard:** Built with React 18, Vite, TypeScript, and Lucide icons with smooth dark/light themes.
- **Packaged Desktop Runner:** Lightweight Electron application allowing local offline-first execution with local Tally access.

---

## Project Structure

```text
Daynisc_Pro/
|-- backend/                       # Python FastAPI Backend
|   |-- demo_server.py             # In-memory standalone development API server
|   |-- main.py                    # Production FastAPI entry point
|   |-- ai_extractor.py            # Google Gemini 1.5 Vision OCR pipeline
|   |-- documents_router.py        # Document ingestion and verification endpoints
|   |-- tally_connector.py         # Tally XML generation & Port 9000 HTTP client
|   |-- odoo_connector.py          # Odoo ERP sync client
|   |-- erp_router.py              # ERP sync router and queue management
|   |-- bank_recon_router.py       # Bank statement parsing & reconciliation endpoints
|   |-- bank_recon_service.py      # Bank reconciliation algorithm & rules
|   |-- config.py                  # Backend configuration settings
|   `-- requirements.txt           # Python dependencies
|
|-- web_dashboard/                 # React + Vite Frontend / Electron Desktop
|   |-- src/ / pages/
|   |   |-- AIVerificationPage.tsx # Document OCR & visual verification editor
|   |   |-- ERPSyncPage.tsx        # TallyPrime & Odoo sync dashboard
|   |   |-- BankReconciliationPage.tsx # Bank statement parser & BRS engine
|   |   |-- DownloadLandingPage.tsx# Download page for Desktop App
|   |   |-- LoginPage.tsx          # Authentication screen
|   |   `-- SettingsPage.tsx       # ERP endpoints & app preferences
|   |-- components/                # Layout, Error Boundary & UI components
|   |-- store/                     # Zustand state & API client
|   |-- main.cjs                   # Electron desktop main process
|   |-- package.json               # Node.js dependencies & scripts
|   `-- vite.config.ts             # Vite build configuration
|
|-- AI-Powered-Bank-Automation.pptx # Project overview presentation
|-- start_all.bat                  # Batch script to launch backend & frontend
`-- README.md                      # Project documentation
```

---

## Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **TallyPrime** (optional, for live XML sync testing)

---

### 1. Backend Setup

You can run either the standalone demo server (zero external database required) or the full FastAPI production server.

#### Quick Start with Demo Server (Recommended for testing):
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python demo_server.py
```
> The API server will start on `http://127.0.0.1:8000`.

#### Or Production Server:
```bash
python main.py
```

---

### 2. Frontend / Web Dashboard Setup

```bash
cd web_dashboard
npm install
npm run dev
```
> The dashboard will run on `http://localhost:3000` (or `http://localhost:5173`).

---

### 3. Launch Desktop App (Electron)

```bash
cd web_dashboard
npm run electron:dev
```
To create a release build:
```bash
npm run electron:build
```

---

### 4. Running Everything Together (Windows)

Double-click `start_all.bat` in the project root to start both backend and frontend servers simultaneously.

---

## TallyPrime Setup Guide

To enable Daynisc Pro to push vouchers directly into TallyPrime:

1. Open **TallyPrime**.
2. Press **F1: Help** > **Settings** > **Connectivity**.
3. Under **Client/Server Configuration**:
   - **TallyPrime acts as:** Both
   - **Enable ODBC:** Yes
   - **Port:** `9000` (default)
4. Restart TallyPrime and open your target company.
5. In Daynisc Pro, navigate to **Settings** or **ERP Sync Hub** and verify connectivity to `http://localhost:9000`.

---

## Environment Variables

Create a `.env` file in the root or `backend/` directory if connecting to production services:

```env
# Google Gemini Vision API
GEMINI_API_KEY=your-gemini-api-key

# TallyPrime URL
TALLY_DEFAULT_URL=http://localhost:9000

# Backend Secret
SECRET_KEY=your-secret-key-here
```

---

## Presentation & Materials

- **Project Presentation Deck:** `AI-Powered-Bank-Automation.pptx` (included in repository root)
- **GitHub Repository:** [https://github.com/dbdigitallabs/Daynisc_Pro.git](https://github.com/dbdigitallabs/Daynisc_Pro.git)
