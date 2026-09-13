# Daynisc: AI-First ERP & Business Automation Ecosystem
## Professional Academic Project Proposal & Viva Presentation Deck (10 Slides)

> **Course / Subject:** Major Project Proposal / Capstone Viva  
> **Academic Session:** 2025 – 2026  
> **Domain:** Artificial Intelligence / Computer Vision / Full-Stack Enterprise Engineering  
> **Generated PowerPoint File:** [Daynisc_Academic_Presentation.pptx](file:///c:/Users/Bhavesh/Desktop/My_Apps/Daynisc/Daynisc_Academic_Presentation.pptx)  
> **Interactive Presenter App:** [presentation.html](file:///c:/Users/Bhavesh/Desktop/My_Apps/Daynisc/presentation.html)

---

##  Slide-by-Slide Presentation Transcript & Viva Guide

---

### Slide 1 — Title Slide

####  Slide Content
- **Header:** ACADEMIC PROJECT PROPOSAL PREPARATION
- **Project Title:** Daynisc: AI-First ERP & Business Automation Ecosystem
- **Tagline:** Intelligent Document Processing, Multimodal Vision OCR & Seamless TallyPrime Synchronization
- **Team Members:** `[STUDENT NAME 1]` & `[STUDENT NAME 2]` *(Or [TO BE PROVIDED])*
- **Course / Subject:** Major Project Capstone Proposal
- **Department & College:** Department of Computer Science & Engineering | `[COLLEGE NAME]`
- **Academic Year:** 2025 – 2026
- **Project Domain:** Artificial Intelligence / Vision Processing / Cloud Microservices

####  Speaker Notes & Presentation Guide
> *"Good morning respected evaluators and panel members. Today we present our major project proposal titled 'Daynisc: An AI-First ERP & Business Automation Ecosystem'. Our system addresses the severe manual operational bottlenecks faced by Indian manufacturing SMEs when processing paper invoices, purchase orders, and inventory vouchers by combining Google Gemini 1.5 Vision OCR, FastAPI microservices, React web dashboard, Flutter mobile app, and automated TallyPrime integration."*

---

### Slide 2 — Problem Statement

####  Slide Content
```
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐
│ 1. CORE PROBLEM             │ │ 2. AFFECTED STAKEHOLDERS    │ │ 3. WHY NEW SOLUTION?        │
├─────────────────────────────┤ ├─────────────────────────────┤ ├─────────────────────────────┤
│ • Manual invoice data entry │ │ • Indian MSMEs & Factories  │ │ • Legacy ERPs lack AI OCR   │
│   is slow & labor-heavy.    │ │ • Warehouse dispatch team   │ │ • Manual transcription is   │
│ • High human error rate in  │ │ • Accounts staff spending   │ │   costly & error-prone.     │
│   line items & tax splits.  │ │   hours on Tally entry.     │ │ • Verification delays cause │
│ • Delayed stock updates     │ │ • Distributors dealing with │ │   missed GST deadlines.     │
│   cause ledger lag.         │ │   heterogeneous bill formats│ │ • Need: Vision OCR + Push.  │
└─────────────────────────────┘ └─────────────────────────────┘ └─────────────────────────────┘
```

####  Speaker Notes & Presentation Guide
> *"In Slide 2, we outline the primary friction. Thousands of Indian SMEs spend hundreds of man-hours each month manually reading physical bills and typing line items into Tally. This manual transcription has an error rate of 3–5%, leads to inventory ledger laggardness, and delays monthly GST filing. Existing legacy ERPs require static manual data entry. Hence, an automated computer vision solution is urgently required."*

---

### Slide 3 — Expected Outcome / Proposed Solution

####  Slide Content
- **Process Flow:**
  $$\text{Manual ERP Friction} \longrightarrow \text{Daynisc Gemini AI Engine} \longrightarrow \text{85\%+ Speedup \& Zero Errors}$$
- **Main Functional System Modules:**
  1. **AI Document Processing:** Multimodal Gemini 1.5 extracts JSON (invoice #, GSTIN, line items).
  2. **Inventory & BOM Engine:** Real-time stock valuation, Bill of Materials, and production order tracking.
  3. **Accounting & Tally Sync:** Auto-generates Tally XML vouchers with retry queue handling.
  4. **GST & e-Way Bill Module:** GSTR data export, IRN generation, and automatic e-Way bill triggers (> ₹50,000).
  5. **Omnichannel Access:** Cross-platform Flutter mobile app + React web dashboard.

####  Speaker Notes & Presentation Guide
> *"Our proposed solution, Daynisc, introduces an intelligent automated ingestion engine. When a bill is uploaded via camera scan or PDF, Gemini 1.5 Vision extracts structured JSON fields. The system automatically creates ERP voucher entries, updates inventory stock levels, pushes XML to TallyPrime, and triggers e-Way Bills for amounts exceeding ₹50,000."*

---

### Slide 4 — System Workflow

####  Slide Content
```
[User Input] ──► [AWS S3 Storage] ──► [Image Preprocess] ──► [Gemini Vision AI]
  (Mobile/Web/WA)    (Raw PDF/Image)     (Denoise/Auto-Rotate)  (Entity JSON Parse)
                                                                     │
                                                                     ▼
[Tally XML Sync] ◄── [Voucher Approved] ◄── [Score >= 0.85?] ──► [Verification Queue]
  (Push to Port)     (Postgres Ledger)         (Decision)          (1-Click Review)
```

####  Speaker Notes & Presentation Guide
> *"Slide 4 displays the end-to-end processing pipeline. Incoming documents are stored encrypted in S3, preprocessed for image quality, and sent to Gemini Vision. If the token extraction confidence score is 0.85 or higher and satisfies balance check rules, the voucher is approved automatically and synced to Tally. Otherwise, it routes to a human verification queue for 1-click approval."*

---

### Slide 5 — Technologies / Tools Planned

####  Slide Content
- **Frontend UI:** React 18 (TypeScript, Vite, Zustand, React Query), Flutter 3.x (iOS/Android), Lucide Icons, Recharts.
- **Backend Stack:** Python 3.11, FastAPI (Async REST Microservices), Celery (Async Task Queue), Nginx API Gateway.
- **Database & Storage:** PostgreSQL (Multi-tenant Schema Isolation), Redis (Cache & Task Broker), AWS S3.
- **AI / ML & Vision:** Google Gemini 1.5 Pro/Flash Vision API, Custom Rule Validation Engine.
- **Services & Deployment:** TallyPrime HTTP XML Interface, WhatsApp Cloud API, Docker, Kubernetes (EKS).

####  Speaker Notes & Presentation Guide
> *"Our technology stack is built for high concurrency and cloud scalability. FastAPI handles asynchronous routing, Celery handles background worker tasks, PostgreSQL enforces tenant data isolation per company, and Flutter delivers native mobile document scanning."*

---

### Slide 6 — Proposed Algorithm / Pseudocode

####  Slide Content
```python
# ALGORITHM: Daynisc_AI_Document_Ingestion_And_Tally_Sync
INPUT : input_file (Image / PDF), tenant_id, channel_type
OUTPUT: Verified_Voucher_Entry, Stock_Ledger_Update, Tally_Sync_Status

START
1. RECEIVE input_file via (Web Dashboard / Mobile App / WhatsApp Webhook)
2. UPLOAD raw input_file to AWS S3 bucket and get s3_file_uri
3. ENQUEUE async processing task to Celery worker queue with s3_file_uri
4. CALL Gemini_Vision_API(s3_file_uri, Prompt_Schema_JSON)
5. PARSE AI JSON response: { invoice_num, vendor_gstin, date, line_items, total_tax, grand_total }
6. COMPUTE confidence_score C via token probability analysis
7. IF C >= 0.85 AND Validate_Tax_Rules(payload) == TRUE THEN
       a. CREATE status = 'APPROVED' Voucher in PostgreSQL Database
       b. GENERATE TallyPrime XML payload AND POST to Tally HTTP Server
       c. UPDATE stock quantities in Inventory Module
   ELSE
       a. CREATE status = 'NEEDS_REVIEW' Voucher in Human Queue
       b. NOTIFY accountant on Web Dashboard for 1-click verification
8. RETURN success status AND update audit trail log
END
```

####  Speaker Notes & Presentation Guide
> *"In Slide 6, we present the core ingestion algorithm. Notice the deterministic rule validation step: mathematical total checks (`subtotal + tax == grand_total`) ensure AI hallucinations never contaminate accounting ledgers."*

---

### Slide 7 — System Architecture / Module Overview

####  Slide Content
```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│       React 18 Web Dashboard  │  Flutter Mobile App  │  WhatsApp       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API & JWT
┌───────────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION & AI SERVICE LAYER                      │
│       FastAPI Microservices  │  Celery Worker Queue  │  Gemini Vision  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL & HTTP XML
┌───────────────────────────────────▼────────────────────────────────────┐
│                  DATA PERSISTENCE & INTEGRATION LAYER                  │
│       PostgreSQL (Multi-tenant) │ AWS S3 Store │ TallyPrime HTTP Port    │
└────────────────────────────────────────────────────────────────────────┘
```

####  Speaker Notes & Presentation Guide
> *"Slide 7 illustrates our 3-tier architecture. Tier 1 provides client access across web, mobile, and WhatsApp. Tier 2 contains FastAPI routers and Celery background workers. Tier 3 manages data persistence in PostgreSQL with strict schema-per-company isolation, plus XML synchronization to TallyPrime."*

---

### Slide 8 — Project Assumptions

####  Slide Content
1. **Input Document Readability:** Legible scans or digital PDFs (min 300 DPI equivalent) provided by users.
2. **Network Connectivity:** Stable internet access at factory premises to communicate with FastAPI and Gemini Cloud APIs.
3. **API Service Quotas:** Google Gemini API, WhatsApp Cloud API, and MSG91 OTP gateways remain accessible with valid credits.
4. **Tally System Setup:** Client machines running TallyPrime have the HTTP XML server interface enabled on port 9000.
5. **Technology Stack Capacity:** FastAPI, PostgreSQL, and Redis stack is sufficient for targeted SME document volumes.

####  Speaker Notes & Presentation Guide
> *"In Slide 8, we state our baseline operational assumptions. We assume legible scans or PDFs, basic internet access for cloud AI inference, and TallyPrime configured with its standard HTTP interface enabled."*

---

### Slide 9 — Challenges / Risks & Open Queries

####  Slide Content
- **Development Risks & Planned Mitigations:**
  - *Blurry / Handwritten Scans:* May drop OCR accuracy $\rightarrow$ **Mitigation:** Fallback to human verification queue.
  - *Vision API Latency (2–4s):* Could slow UI $\rightarrow$ **Mitigation:** Non-blocking Celery async background processing.
  - *Tally Offline State:* Local server disconnects $\rightarrow$ **Mitigation:** Retry queue in Redis with exponential backoff.
- **Open Implementation Queries:**
  - Optimizing prompt engineering for Indian regional languages (Hindi, Gujarati).
  - Fine-tuning confidence score cutoff ($0.80$ vs $0.85$) to minimize review load.
  - Mobile local caching for offline document scanning in low-reception areas.

####  Speaker Notes & Presentation Guide
> *"Slide 9 addresses real-world engineering risks. For blurry or handwritten bills, low confidence scores trigger the human verification queue. If Tally is offline, vouchers remain safely queued in Redis until network connectivity is restored."*

---

### Slide 10 — Conclusion & Expected Impact

####  Slide Content
- **Problem Solved:** Eliminates manual data entry friction, reduces accounting backlog, and prevents transcription errors.
- **Solution Delivered:** Integrated ecosystem uniting Gemini Vision AI, FastAPI microservices, React, Flutter, and Tally.
- **Expected Impact:** 85%+ reduction in voucher processing time, 100% audit compliance, and real-time inventory tracking.
- **Future Scope:** Regional multi-language AI self-learning, inventory demand forecasting, and SAP/Zoho ERP connectors.
- **Q&A:** Thank You! Open for Evaluator Questions & Discussion.

####  Speaker Notes & Presentation Guide
> *"To conclude, Daynisc provides a modern, scalable AI solution tailored for Indian SMEs. It delivers an 85% time reduction in voucher entry while maintaining 100% ledger auditability. Thank you, and we welcome your questions!"*

---

##  How to Use & Present These Slides

1. **PowerPoint File (.pptx):** Open `Daynisc_Academic_Presentation.pptx` in Microsoft PowerPoint or Google Slides for full slide presentation.
2. **Interactive Presenter App (.html):** Open `presentation.html` in any web browser. Use Keyboard Arrow keys (`Left`/`Right`), `F` for Fullscreen, `N` for Speaker Notes, and `G` for Overview Grid.
3. **PDF Export / Print:** In `presentation.html`, click **Print PDF** or press `Ctrl + P` to export perfectly formatted widescreen slides.
