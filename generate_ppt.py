import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_academic_presentation(output_path="Daynisc_Academic_Presentation.pptx"):
    prs = Presentation()
    # Set slide dimensions to widescreen 16:9
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_slide_layout = prs.slide_layouts[6]

    # Color Palette - Academic Modern Dark Navy & Cyan Accent
    NAVY_DARK = RGBColor(15, 23, 42)      # #0F172A (Slide background dark variant)
    BG_LIGHT = RGBColor(248, 250, 252)    # #F8FAFC (Main slide light background)
    TEXT_MAIN = RGBColor(30, 41, 59)      # #1E293B (Primary dark text)
    TEXT_MUTED = RGBColor(100, 116, 139)  # #64748B (Subtitle / secondary text)
    PRIMARY_BLUE = RGBColor(37, 99, 235)  # #2563EB (Brand primary accent)
    ACCENT_CYAN = RGBColor(6, 182, 212)   # #06B6D4 (Accent highlight)
    CARD_BG = RGBColor(255, 255, 255)     # #FFFFFF (Card background)
    CARD_BORDER = RGBColor(226, 232, 240) # #E2E8F0 (Card border)
    CODE_BG = RGBColor(15, 23, 42)       # #0F172A (Pseudocode background)
    CODE_TEXT = RGBColor(241, 245, 249)   # #F1F5F9 (Code text color)

    def add_header(slide, title_text, category_text="ACADEMIC PROJECT PROPOSAL"):
        # Header banner shape
        top_banner = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(1.1))
        top_banner.fill.solid()
        top_banner.fill.fore_color.rgb = NAVY_DARK
        top_banner.line.color.rgb = NAVY_DARK

        # Category pill
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.15), Inches(8), Inches(0.3))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_CYAN
        p_cat.font.name = "Arial"

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.5), Inches(0.6))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = RGBColor(255, 255, 255)
        p_title.font.name = "Arial"

        # Footer line & text
        footer_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.02))
        footer_line.fill.solid()
        footer_line.fill.fore_color.rgb = CARD_BORDER
        footer_line.line.color.rgb = CARD_BORDER

        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(11.733), Inches(0.35))
        tf_foot = footer_box.text_frame
        p_foot = tf_foot.paragraphs[0]
        p_foot.text = "Daynisc — AI-First ERP & Business Automation Ecosystem | Academic Presentation"
        p_foot.font.size = Pt(9)
        p_foot.font.color.rgb = TEXT_MUTED
        p_foot.font.name = "Arial"

    def set_slide_bg(slide, color=BG_LIGHT):
        bg = slide.background
        fill = bg.fill
        fill.solid()
        fill.fore_color.rgb = color

    def add_card(slide, left, top, width, height, title, items, badge_text=None, border_color=PRIMARY_BLUE):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_top = Inches(0.2)
        tf.margin_right = Inches(0.2)

        if badge_text:
            p_badge = tf.paragraphs[0]
            p_badge.text = badge_text.upper()
            p_badge.font.size = Pt(9)
            p_badge.font.bold = True
            p_badge.font.color.rgb = PRIMARY_BLUE
            p_head = tf.add_paragraph()
        else:
            p_head = tf.paragraphs[0]

        p_head.text = title
        p_head.font.size = Pt(14)
        p_head.font.bold = True
        p_head.font.color.rgb = TEXT_MAIN
        p_head.space_after = Pt(8)

        for item in items:
            p_item = tf.add_paragraph()
            p_item.text = f"• {item}"
            p_item.font.size = Pt(11)
            p_item.font.color.rgb = TEXT_MAIN
            p_item.space_after = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide1, NAVY_DARK)

    # Decorative Accent Line
    acc_line = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.5), Inches(0.1), Inches(4.5))
    acc_line.fill.solid()
    acc_line.fill.fore_color.rgb = ACCENT_CYAN
    acc_line.line.color.rgb = ACCENT_CYAN

    # Title Box
    tbox = slide1.shapes.add_textbox(Inches(1.3), Inches(1.5), Inches(11.0), Inches(2.2))
    tf1 = tbox.text_frame
    tf1.word_wrap = True

    p_badge = tf1.paragraphs[0]
    p_badge.text = "ACADEMIC PROJECT PROPOSAL PREPARED FOR VIVA & EVALUATION"
    p_badge.font.size = Pt(11)
    p_badge.font.bold = True
    p_badge.font.color.rgb = ACCENT_CYAN
    p_badge.space_after = Pt(10)

    p_main = tf1.add_paragraph()
    p_main.text = "Daynisc: AI-First ERP & Business Automation Ecosystem"
    p_main.font.size = Pt(30)
    p_main.font.bold = True
    p_main.font.color.rgb = RGBColor(255, 255, 255)
    p_main.space_after = Pt(10)

    p_tag = tf1.add_paragraph()
    p_tag.text = "Automated Document Vision OCR, Multi-Tenant Cloud Microservices & TallyPrime Synchronization"
    p_tag.font.size = Pt(16)
    p_tag.font.color.rgb = RGBColor(203, 213, 225)

    # Metadata Grid Box
    mbox = slide1.shapes.add_textbox(Inches(1.3), Inches(4.2), Inches(11.0), Inches(2.3))
    tf_m = mbox.text_frame
    tf_m.word_wrap = True

    p_team = tf_m.paragraphs[0]
    p_team.text = "Team Members: [STUDENT NAME 1] & [STUDENT NAME 2] (or To Be Provided)"
    p_team.font.size = Pt(13)
    p_team.font.bold = True
    p_team.font.color.rgb = RGBColor(255, 255, 255)

    p_dept = tf_m.add_paragraph()
    p_dept.text = "Department / Institute: Department of Computer Science & Engineering | [COLLEGE NAME]"
    p_dept.font.size = Pt(12)
    p_dept.font.color.rgb = RGBColor(203, 213, 225)

    p_domain = tf_m.add_paragraph()
    p_domain.text = "Project Domain: Artificial Intelligence / Vision Processing / Cloud Full-Stack Systems"
    p_domain.font.size = Pt(12)
    p_domain.font.color.rgb = ACCENT_CYAN

    p_yr = tf_m.add_paragraph()
    p_yr.text = "Academic Session: 2025 – 2026"
    p_yr.font.size = Pt(12)
    p_yr.font.color.rgb = RGBColor(203, 213, 225)


    # -------------------------------------------------------------
    # SLIDE 2: Problem Statement
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide2)
    add_header(slide2, "Slide 2: Problem Statement — Friction in SME ERP Entry")

    add_card(slide2, 0.8, 1.4, 3.6, 5.2, "Core Problem", [
        "Manual invoice and receipt voucher entry is tedious and slow.",
        "High human error rate in line items, tax splits, and totals.",
        "Delayed stock updates cause inventory inaccuracies.",
        "Paper document backlogs bottleneck financial audits."
    ], badge_text="IDENTIFIED FRICTION", border_color=PRIMARY_BLUE)

    add_card(slide2, 4.8, 1.4, 3.6, 5.2, "Who is Affected?", [
        "Indian Micro, Small & Medium Enterprises (MSMEs).",
        "Factory managers & warehouse dispatch coordinators.",
        "Accountants spending hours on Tally data entry.",
        "Distributors dealing with heterogeneous invoice layouts."
    ], badge_text="TARGET STAKEHOLDERS", border_color=PRIMARY_BLUE)

    add_card(slide2, 8.8, 1.4, 3.7, 5.2, "Existing Limitations & Need", [
        "Legacy ERPs lack native AI vision & computer vision OCR.",
        "Manual entry incurs recurring operational overhead costs.",
        "Verification delays cause missed GST reconciliation deadlines.",
        "Need: Automated vision extraction + Seamless Tally sync."
    ], badge_text="WHY NEW SOLUTION?", border_color=ACCENT_CYAN)


    # -------------------------------------------------------------
    # SLIDE 3: Proposed Solution / Expected Outcome
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide3)
    add_header(slide3, "Slide 3: Proposed Solution — Daynisc AI-First Ecosystem")

    # Flow Container Cards (Problem -> Proposed Solution -> Expected Benefit)
    add_card(slide3, 0.8, 1.4, 3.6, 2.4, "1. Identified Problem", [
        "Manual document entry bottlenecks",
        "Error-prone data transcription",
        "Unsynchronized inventory ledgers"
    ], badge_text="CURRENT STATE", border_color=TEXT_MUTED)

    add_card(slide3, 4.8, 1.4, 3.6, 2.4, "2. Proposed Solution", [
        "Gemini 1.5 Vision OCR pipeline",
        "FastAPI microservices & rule validation",
        "Human verification fallback queue"
    ], badge_text="DAYNISC SOLUTION", border_color=PRIMARY_BLUE)

    add_card(slide3, 8.8, 1.4, 3.7, 2.4, "3. Expected Benefits", [
        "85%+ reduction in voucher entry time",
        "Near 100% accurate human-in-loop verification",
        "Automated Tally XML sync & e-Way Bill"
    ], badge_text="PROJECT IMPACT", border_color=ACCENT_CYAN)

    # Core System Modules List Card
    add_card(slide3, 0.8, 4.1, 11.7, 2.6, "Core Functional System Modules", [
        "AI Document Extractor: Multimodal Gemini Vision extracts structured JSON (invoice #, line items, taxes).",
        "Inventory & BOM Manager: Live stock valuation, bill of materials (BOM), and production order tracking.",
        "Accounting & Tally Sync: Automated voucher creation with TallyPrime HTTP XML synchronization.",
        "GST & e-Way Bill Module: GSTR data export, IRN generation, and automatic e-Way bill triggers (> ₹50,000).",
        "Omnichannel Access: Cross-platform Flutter mobile client (iOS/Android) and React web dashboard."
    ], badge_text="SYSTEM HIGHLIGHTS", border_color=PRIMARY_BLUE)


    # -------------------------------------------------------------
    # SLIDE 4: System Workflow
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide4)
    add_header(slide4, "Slide 4: End-to-End System Processing Workflow")

    steps = [
        ("Step 1: Input", "User uploads image/PDF via Mobile, Web, or WhatsApp"),
        ("Step 2: Ingestion", "File uploaded to AWS S3 & metadata logged in Postgres"),
        ("Step 3: Preprocessing", "Image denoise, auto-rotate, and quality validation"),
        ("Step 4: AI Extraction", "Gemini Vision AI parses fields into structured JSON"),
        ("Step 5: Decision Logic", "If confidence ≥ 0.85 → Auto-Approve else Queue"),
        ("Step 6: Output & Sync", "Voucher created, Tally XML pushed, notification sent")
    ]

    left_margin = 0.8
    card_width = 1.75
    gap = 0.2
    for i, (stitle, sdesc) in enumerate(steps):
        c_left = left_margin + i * (card_width + gap)
        add_card(slide4, c_left, 1.6, card_width, 5.0, stitle, [sdesc], badge_text=f"PHASE 0{i+1}", border_color=ACCENT_CYAN if i==3 else PRIMARY_BLUE)


    # -------------------------------------------------------------
    # SLIDE 5: Technologies / Tools Planned
    # -------------------------------------------------------------
    slide5 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide5)
    add_header(slide5, "Slide 5: Planned Technology Stack & Tools")

    add_card(slide5, 0.8, 1.4, 3.6, 2.5, "Frontend Stack", [
        "React 18 & TypeScript (Web Dashboard)",
        "Vite, Zustand & React Query",
        "Flutter 3.x (iOS & Android Apps)",
        "Lucide Icons & Recharts Visualization"
    ], badge_text="USER INTERFACE", border_color=PRIMARY_BLUE)

    add_card(slide5, 4.8, 1.4, 3.6, 2.5, "Backend Stack", [
        "Python 3.11 & FastAPI Microservices",
        "Celery Async Worker Queue",
        "SQLAlchemy Async ORM",
        "Nginx API Gateway & Reverse Proxy"
    ], badge_text="SERVER & LOGIC", border_color=PRIMARY_BLUE)

    add_card(slide5, 8.8, 1.4, 3.7, 2.5, "Database & Storage", [
        "PostgreSQL (Multi-tenant Schema Isolation)",
        "Redis (Key-Value Cache & Message Broker)",
        "AWS S3 (Encrypted Document Storage)"
    ], badge_text="DATA MANAGEMENT", border_color=PRIMARY_BLUE)

    add_card(slide5, 0.8, 4.2, 5.6, 2.5, "AI / ML & Vision Services", [
        "Google Gemini 1.5 Pro / Flash Vision API",
        "Multimodal Text & Table Entity Extraction",
        "Regex & Rule-Based Field Validation Engine",
        "Confidence Scoring Algorithm (0.0 - 1.0)"
    ], badge_text="AI ENGINE", border_color=ACCENT_CYAN)

    add_card(slide5, 6.8, 4.2, 5.7, 2.5, "APIs, Services & DevOps", [
        "TallyPrime HTTP XML Server Interface",
        "WhatsApp Business Cloud API & Webhooks",
        "MSG91 SMS OTP Authentication API",
        "Docker, Docker-Compose & Kubernetes (EKS)"
    ], badge_text="INTEGRATION & DEPLOYMENT", border_color=PRIMARY_BLUE)


    # -------------------------------------------------------------
    # SLIDE 6: Proposed Algorithm / Pseudocode
    # -------------------------------------------------------------
    slide6 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide6)
    add_header(slide6, "Slide 6: Document Processing & Verification Algorithm")

    # Code Box
    cbox = slide6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.4), Inches(11.733), Inches(5.2))
    cbox.fill.solid()
    cbox.fill.fore_color.rgb = CODE_BG
    cbox.line.color.rgb = ACCENT_CYAN
    cbox.line.width = Pt(1.5)

    tf_code = cbox.text_frame
    tf_code.word_wrap = True
    tf_code.margin_left = Inches(0.3)
    tf_code.margin_top = Inches(0.3)

    code_lines = [
        ("ALGORITHM: AI_Document_Ingestion_And_Tally_Sync", ACCENT_CYAN, True),
        ("INPUT : Document File (Image / PDF), Tenant_ID, Source_Channel", CODE_TEXT, False),
        ("OUTPUT: Verified ERP Voucher Entry, Updated Inventory & Tally XML Sync Status", CODE_TEXT, False),
        ("----------------------------------------------------------------------------------", TEXT_MUTED, False),
        ("1. START", ACCENT_CYAN, True),
        ("2. RECEIVE input_file FROM (Web / Mobile / WhatsApp webhook)", CODE_TEXT, False),
        ("3. UPLOAD raw input_file TO AWS S3 storage AND retrieve S3_URI", CODE_TEXT, False),
        ("4. ENQUEUE asynchronous extraction task TO Celery worker queue", CODE_TEXT, False),
        ("5. CALL Gemini_Vision_API(S3_URI, Structured_Schema_Prompt)", CODE_TEXT, False),
        ("6. EXTRACT JSON payload: {invoice_num, date, vendor_gstin, line_items, total_tax, grand_total}", CODE_TEXT, False),
        ("7. CALCULATE confidence_score C via token probability analysis", CODE_TEXT, False),
        ("8. IF C >= 0.85 AND Validate_Tax_Rules(payload) == TRUE THEN", ACCENT_CYAN, True),
        ("       a. CREATE status = 'APPROVED' Voucher in PostgreSQL Database", CODE_TEXT, False),
        ("       b. GENERATE TallyPrime XML payload AND POST to Tally HTTP Server", CODE_TEXT, False),
        ("       c. UPDATE stock quantities in Inventory Module", CODE_TEXT, False),
        ("   ELSE", ACCENT_CYAN, True),
        ("       a. CREATE status = 'NEEDS_REVIEW' Voucher in Human Queue", CODE_TEXT, False),
        ("       b. NOTIFY accountant on Web Dashboard for 1-click verification", CODE_TEXT, False),
        ("9. RETURN success status AND update audit trail log", CODE_TEXT, False),
        ("10. END", ACCENT_CYAN, True)
    ]

    for text, col, is_bold in code_lines:
        p = tf_code.add_paragraph() if tf_code.paragraphs[0].text else tf_code.paragraphs[0]
        p.text = text
        p.font.name = "Consolas"
        p.font.size = Pt(11)
        p.font.bold = is_bold
        p.font.color.rgb = col
        p.space_after = Pt(2)


    # -------------------------------------------------------------
    # SLIDE 7: System Architecture / Module Overview
    # -------------------------------------------------------------
    slide7 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide7)
    add_header(slide7, "Slide 7: High-Level System Architecture & Interactions")

    add_card(slide7, 0.8, 1.4, 3.6, 5.2, "Presentation Layer", [
        "React 18 Web Dashboard for accountants & managers.",
        "Flutter Mobile App for warehouse scan & dispatch.",
        "WhatsApp Business Interface for fast document submission.",
        "Role-Based Access Control (RBAC) & OTP auth."
    ], badge_text="1. CLIENT INTERFACES", border_color=PRIMARY_BLUE)

    add_card(slide7, 4.8, 1.4, 3.6, 5.2, "Application & AI Services", [
        "FastAPI Microservices (Async REST API router).",
        "Celery Worker Queue for asynchronous AI background tasks.",
        "Gemini 1.5 Vision Engine for OCR entity extraction.",
        "Rule Validation Engine for invoice balance checks."
    ], badge_text="2. CORE SERVICES", border_color=ACCENT_CYAN)

    add_card(slide7, 8.8, 1.4, 3.7, 5.2, "Data & External Integrations", [
        "PostgreSQL (Multi-tenant schema-per-company isolation).",
        "AWS S3 bucket for encrypted raw invoice storage.",
        "TallyPrime Connector (Pushes XML to local Tally HTTP port).",
        "GST Portal / IRP API (e-Invoice & e-Way Bill sync)."
    ], badge_text="3. STORAGE & ERP", border_color=PRIMARY_BLUE)


    # -------------------------------------------------------------
    # SLIDE 8: Project Assumptions
    # -------------------------------------------------------------
    slide8 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide8)
    add_header(slide8, "Slide 8: Reasonable Project Assumptions")

    assumptions = [
        ("Input Quality Assumption", "Users will upload reasonably legible document scans or digital PDFs (minimum 300 DPI equivalent) with readable text for AI OCR."),
        ("Network Connectivity", "Factory premises and web/mobile client devices have active internet access to communicate with cloud FastAPI and Gemini APIs."),
        ("Third-Party API Quotas", "Google Gemini API, WhatsApp Business Cloud API, and MSG91 SMS gateway remain operational with valid API credentials."),
        ("Tally System Environment", "Target client machines running TallyPrime have the native HTTP XML server interface enabled on a reachable network port (e.g. 9000)."),
        ("Technology Stack Scalability", "The selected tech stack (FastAPI, PostgreSQL, Redis, React, Flutter) is scalable and adequate for target SME workload demands.")
    ]

    for i, (atitle, adesc) in enumerate(assumptions):
        atop = 1.4 + i * 1.05
        add_card(slide8, 0.8, atop, 11.733, 0.95, atitle, [adesc], badge_text=f"ASSUMPTION 0{i+1}", border_color=PRIMARY_BLUE)


    # -------------------------------------------------------------
    # SLIDE 9: Challenges, Risks & Open Queries
    # -------------------------------------------------------------
    slide9 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide9)
    add_header(slide9, "Slide 9: Realistic Technical Challenges & Open Queries")

    add_card(slide9, 0.8, 1.4, 5.7, 5.2, "Development Challenges & Risks", [
        "Document Quality & Handwriting: Damaged or hand-written invoices may drop OCR accuracy below target threshold -> Solution: Human verification queue.",
        "AI Vision API Latency: Cloud API calls incur 2-4 sec delay -> Solution: Non-blocking Celery background workers with optimistic UI updates.",
        "Tally Offline Sync: Factory local Tally may go offline -> Solution: Retrying queue in Redis that syncs automatically upon reconnection.",
        "Data Security & Isolation: SME financial data privacy -> Solution: PostgreSQL schema-per-company isolation & S3 encryption."
    ], badge_text="PLANNED RISK MITIGATION", border_color=PRIMARY_BLUE)

    add_card(slide9, 6.8, 1.4, 5.7, 5.2, "Open Implementation Queries", [
        "Multi-lingual Extraction: Optimizing Gemini prompt engineering for regional Indian language invoices (Hindi, Gujarati).",
        "Threshold Tuning: Determining the optimal confidence cutoff (e.g. 0.80 vs 0.85) to minimize review overhead while preventing errors.",
        "Custom Template Mapping: Handling non-standard invoice formats without requiring manual template definitions.",
        "Offline Mobile Mode: Determining offline local caching capabilities for mobile scan uploads in remote factory locations."
    ], badge_text="OPEN RESEARCH QUERIES", border_color=ACCENT_CYAN)


    # -------------------------------------------------------------
    # SLIDE 10: Conclusion & Expected Impact
    # -------------------------------------------------------------
    slide10 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide10, NAVY_DARK)

    # Header in Slide 10 (Dark Mode variant)
    tbox10 = slide10.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.0))
    tf10 = tbox10.text_frame
    tf10.word_wrap = True

    p10_b = tf10.paragraphs[0]
    p10_b.text = "SUMMARY & EXPECTED VALUE DELIVERABLE"
    p10_b.font.size = Pt(10)
    p10_b.font.bold = True
    p10_b.font.color.rgb = ACCENT_CYAN

    p10_t = tf10.add_paragraph()
    p10_t.text = "Slide 10: Conclusion & Expected Impact"
    p10_t.font.size = Pt(24)
    p10_t.font.bold = True
    p10_t.font.color.rgb = RGBColor(255, 255, 255)

    # 4 Dark Cards Grid
    card_data = [
        ("Problem Solved", "Eliminates friction of manual invoice data entry, reduces accounting backlog, and prevents costly human errors."),
        ("Proposed Solution", "Daynisc unites Gemini 1.5 Vision OCR, FastAPI microservices, React, Flutter, and automated Tally sync into a unified platform."),
        ("Expected Impact", "85%+ reduction in voucher creation time, 100% data auditability, and immediate stock visibility for Indian SMEs."),
        ("Future Scope", "Self-learning prompt tuning for regional formats, predictive inventory demand forecasting, and SAP/Zoho ERP integrations.")
    ]

    for i, (ctitle, cdesc) in enumerate(card_data):
        col = i % 2
        row = i // 2
        cx = 0.8 + col * 5.9
        cy = 1.6 + row * 2.3

        card = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx), Inches(cy), Inches(5.6), Inches(2.1))
        card.fill.solid()
        card.fill.fore_color.rgb = RGBColor(30, 41, 59)
        card.line.color.rgb = ACCENT_CYAN if i == 1 else PRIMARY_BLUE
        card.line.width = Pt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.25)
        tf.margin_top = Inches(0.2)
        tf.margin_right = Inches(0.25)

        p1 = tf.paragraphs[0]
        p1.text = ctitle
        p1.font.size = Pt(15)
        p1.font.bold = True
        p1.font.color.rgb = ACCENT_CYAN
        p1.space_after = Pt(6)

        p2 = tf.add_paragraph()
        p2.text = cdesc
        p2.font.size = Pt(11)
        p2.font.color.rgb = RGBColor(226, 232, 240)

    # Thank you box at bottom
    thx_box = slide10.shapes.add_textbox(Inches(0.8), Inches(6.3), Inches(11.733), Inches(0.7))
    tf_thx = thx_box.text_frame
    p_thx = tf_thx.paragraphs[0]
    p_thx.alignment = PP_ALIGN.CENTER
    p_thx.text = "Thank You! Questions & Technical Discussion"
    p_thx.font.size = Pt(20)
    p_thx.font.bold = True
    p_thx.font.color.rgb = RGBColor(255, 255, 255)

    prs.save(output_path)
    print(f"Successfully generated PowerPoint presentation at: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    create_academic_presentation()
