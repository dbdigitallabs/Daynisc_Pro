# Daynisc AI ERP — TallyPrime Integration Architecture & Technical Guide

> **A comprehensive technical guide to Daynisc's automated TallyPrime integration: end-to-end data flow, network connectivity, Python libraries, and API specifications.**

---

## 1. Executive Summary & Flow

Daynisc automates the transition from raw business documents (tax invoices, purchase bills, payment receipts) to reconciled ledger and inventory entries in **TallyPrime / Tally.ERP 9**.

### End-to-End Workflow Diagram

```
+-----------------------------------------------------------------------------------+
| 1. DOCUMENT INGESTION & AI EXTRACTION                                             |
|    Document Upload (PDF/Image)                                                    |
|    --> S3 Ingestion Pipeline                                                      |
|    --> Google Gemini 1.5 Vision OCR Engine                                        |
|    --> Extracted: Vendor, Buyer, GSTINs, Line Items, Rates, HSN/SAC, CGST/SGST/IGST |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. VOUCHER CREATION IN POSTGRESQL                                                 |
|    Inserts into schema: `accounting_vouchers` table                               |
|    Initial status flags: `tally_synced = FALSE`, `tally_sync_at = NULL`            |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
   [Trigger Option A: Automated Queue]       [Trigger Option B: Manual UI Sync]
   • Celery Worker: `tasks.sync_to_tally_task`• Web Dashboard 1-Click Sync
   • Queue: `erp`                            • `POST /api/v1/erp/sync/voucher/{id}`
   • Celery Beat: Retries failed every 5 min • Bulk Sync: `POST /api/v1/erp/sync/bulk`
                     |                                         |
                     +--------------------+--------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 3. XML ENVELOPE BUILDER (`tally_connector.py`)                                     |
|    • Resolves tenant company configuration (`url`, `company_name`)                |
|    • Checks/creates party ledgers (`<LEDGER ACTION="Create">`)                     |
|    • Maps voucher type (Purchase, Sales, Payment, Receipt, Stock Journal)         |
|    • Generates compliant TDL XML `<ENVELOPE>` with debit/credit ledger balance      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 4. HTTP POST TRANSMISSION (`httpx.AsyncClient`)                                   |
|    • Destination: `http://localhost:9000` (or company-configured remote URL)     |
|    • Payload: `text/xml; charset=utf-8`                                            |
|    • Timeout: Configured via `settings.TALLY_TIMEOUT` (default: 30s)               |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 5. TALLYPRIME INGESTION & XML RESPONSE                                            |
|    • Tally XML Engine validates ledger names, dates, amounts, and GST rules        |
|    • Returns `<RESPONSE>`: `<CREATED>1</CREATED>` or `<LINEERROR>...</LINEERROR>` |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
              [If Success]                               [If Failure]
                     |                                         |
                     v                                         v
   • Set `tally_synced = TRUE`               • Set `tally_synced = FALSE`
   • Set `tally_sync_at = NOW()`             • Append error message to `narration`
   • Status updated in real-time             • Celery worker triggers auto-retry
     on Web/Mobile Dashboard                   with exponential backoff
```

---

## 2. How Daynisc Connects to Tally (Architecture & Connectivity)

TallyPrime (and Tally.ERP 9) provides a native, built-in **HTTP XML Server** operating on top of its Tally Definition Language (TDL) engine. It does **not** require third-party ODBC bridges, proprietary drivers, or custom DLL installations.

### Connection Architecture
* **Protocol**: Standard HTTP (POST / GET)
* **Default Port**: `9000` (URL: `http://localhost:9000` or `http://<ip-address>:9000`)
* **Content-Type**: `text/xml; charset=utf-8`
* **Data Format**: Tally XML Envelope (`<ENVELOPE> ... </ENVELOPE>`)

### Tally Server Setup Requirements
To allow Daynisc to communicate with TallyPrime:
1. Open **TallyPrime**.
2. Press **F1 (Help)** $\rightarrow$ **Settings** $\rightarrow$ **Connectivity** (or press **F12 $\rightarrow$ Advanced Configuration** in Tally.ERP 9).
3. Set **Client/Server Configuration**:
   - `TallyPrime acts as`: **Both** or **Server**
   - `Enable HTTP Server`: **Yes**
   - `Port`: **9000**
4. Restart TallyPrime and ensure the target Company is open.

---

## 3. Python Libraries Used & Justification

| Library | Version | Role & Functionality | Why This Library Was Chosen |
| :--- | :--- | :--- | :--- |
| **`httpx`** | `0.28.1` | Asynchronous HTTP client for sending XML requests to Tally | Modern `asyncio`-native client. Daynisc's backend (FastAPI and async Celery workers) relies on non-blocking I/O. `httpx.AsyncClient` prevents Tally network lag from blocking the event loop and provides granular timeout controls (`ConnectError`, `TimeoutException`). |
| **`xml.etree.ElementTree`** | Built-in | XML serialization, escaping, and response parsing | Zero external dependencies, ultra-fast C-implementation for validating incoming XML responses from Tally without package maintenance overhead. |
| **`celery`** | `5.4.0` | Background task distribution & worker scheduling | Local Tally instances may go offline, reboot, or have network interruptions. Celery offloads synchronization to a background queue (`erp`) and automatically retries with exponential backoff (`max_retries=5`). |
| **`redis`** | `5.0.5` | In-memory message broker & task result backend | High-throughput broker used by Celery to queue sync operations, cache tenant connections, and manage rate limiting. |
| **`sqlalchemy` (asyncpg)** | `2.0.41` / `0.30.0` | Async database ORM & multi-tenant PostgreSQL queries | Manages multi-tenant schemas (`SET search_path TO {tenant_schema}`), fetches vouchers and line items, and updates sync states atomically. |
| **`pydantic` & `pydantic-settings`** | `2.11.5` / `2.9.1` | Environment variable validation & type safety | Strictly validates `TALLY_DEFAULT_URL` and `TALLY_TIMEOUT`, ensuring invalid configurations fail fast during server startup. |

---

## 4. API Reference

### 4.1 Internal Daynisc Backend Endpoints (`erp_router.py`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/erp/connection/test/tally` | Pings TallyPrime on port 9000 to verify connectivity. Returns server version/status. | Yes (JWT) |
| `POST` | `/api/v1/erp/sync/voucher/{voucher_id}` | Manually triggers synchronization for an individual voucher. | Yes (JWT) |
| `POST` | `/api/v1/erp/sync/bulk` | Bulk pushes up to 100 unsynced vouchers from the last 30 days. | Yes (JWT) |
| `GET` | `/api/v1/erp/status` | Aggregates sync statistics (count of pending, synced, and failed vouchers). | Yes (JWT) |

---

### 4.2 External Tally XML APIs (`tally_connector.py`)

All payloads are sent via `POST` to the Tally HTTP URL (default: `http://localhost:9000`).

#### 1. Connection Ping & Company Inspection
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
```
* **Why**: Validates that Tally’s HTTP service is alive and listening before sending transactional data.

---

#### 2. Purchase Voucher Posting (`VCHTYPE="Purchase"`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Daynisc Enterprises Pvt Ltd</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>20260904</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>BILL-2026-0891</VOUCHERNUMBER>
            <PARTYLEDGERNAME>Raw Materials Supplier Ltd</PARTYLEDGERNAME>
            <NARRATION>Purchase Bill BILL-2026-0891 - Ingested via Daynisc AI</NARRATION>
            
            <!-- Sundry Creditors (Supplier Credit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Raw Materials Supplier Ltd</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>11800.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Stock Item Debit with Godown & Tax Breakdown -->
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>Steel Rods 10mm</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <RATE>50.0000/KG</RATE>
              <AMOUNT>-10000.00</AMOUNT>
              <ACTUALQTY>200.000 KG</ACTUALQTY>
              <BILLEDQTY>200.000 KG</BILLEDQTY>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Godown</GODOWNNAME>
                <AMOUNT>-10000.00</AMOUNT>
                <ACTUALQTY>200.000 KG</ACTUALQTY>
              </BATCHALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>

            <!-- Input Tax Ledgers -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-900.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>SGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-900.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```
* **Why**: Automates accounts payable, allocates inventory into specific Godowns/batches, and logs input tax credits for GST compliance.

---

#### 3. Sales Voucher Posting (`VCHTYPE="Sales"`)
* **Action**: Debits customer (`Sundry Debtors`), credits sales ledger (`Sales @18%`), debits inventory, and credits output tax accounts (`CGST`/`SGST`/`IGST`).
* **Why**: Synchronizes outward client billing generated from the Daynisc POS, mobile app, or dispatch system.

---

#### 4. Payment & Receipt Vouchers (`VCHTYPE="Payment"`, `VCHTYPE="Receipt"`)
* **Payment**: Debits party ledger and credits `Bank Account` / `Cash`.
* **Receipt**: Credits party ledger and debits `Bank Account` / `Cash`.
* **Why**: Closes outstanding bills and automates bank/cash reconciliation.

---

#### 5. Stock Journal Posting (`VCHTYPE="Stock Journal"`)
* **Action**: Defines source materials (`ISDEEMEDPOSITIVE=No`) consumed on the manufacturing floor and finished goods produced (`ISDEEMEDPOSITIVE=Yes`).
* **Why**: Directly links factory Bill of Materials (BOM) production runs to real-time Tally inventory balances.

---

#### 6. Auto Master Creation (`<LEDGER ACTION="Create">`)
```xml
<LEDGER NAME="Apex Traders" ACTION="Create">
  <NAME>Apex Traders</NAME>
  <PARENT>Sundry Creditors</PARENT>
  <GSTNREGISTRATIONTYPE>Regular</GSTNREGISTRATIONTYPE>
  <PARTYGSTIN>27AABCA1234F1Z5</PARTYGSTIN>
  <MAILINGNAME>Apex Traders</MAILINGNAME>
  <ADDRESS.LIST><ADDRESS>Unit 4, MIDC Industrial Area</ADDRESS></ADDRESS.LIST>
  <STATENAME>Maharashtra</STATENAME>
  <PINCODE>400001</PINCODE>
</LEDGER>
```
* **Why**: Prevents voucher sync rejections by creating new vendor/customer masters in Tally if they do not yet exist.

---

## 5. Resilience & Error Handling

1. **Offline Mitigation**: When remote factory computers run Tally and lose internet connectivity, Celery catches connection timeouts (`httpx.ConnectError`) and holds jobs in Redis.
2. **Exponential Backoff**: Retries are scheduled with exponential delays ($60s \times 2^{\text{retry}}$ up to 1 hour).
3. **Audit Trail**: Any XML error returned by Tally (such as `<LINEERROR>Ledger does not exist</LINEERROR>`) is recorded directly in the database voucher narration for immediate operator review.

---
*Created for Daynisc AI ERP & Business Automation Platform.*
