-- ============================================================
-- AI ERP Platform — Complete PostgreSQL Database Schema
-- Multi-tenant: each company gets its own schema (schema-per-tenant)
-- Run this for each new company: SET search_path TO company_xyz, public;
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ── ENUM Types ────────────────────────────────────────────────────────────────

CREATE TYPE voucher_type_enum AS ENUM (
  'purchase','sales','payment','receipt','journal','debit_note','credit_note'
);

CREATE TYPE stock_movement_enum AS ENUM (
  'inward','outward','transfer','adjustment','production_consumption','production_output'
);

CREATE TYPE order_status_enum AS ENUM (
  'draft','confirmed','dispatched','delivered','cancelled','closed'
);

CREATE TYPE production_status_enum AS ENUM (
  'planned','in_progress','completed','on_hold','cancelled'
);

CREATE TYPE extraction_status_enum AS ENUM (
  'pending','extracted','verified','review','pushed','failed'
);

CREATE TYPE doc_type_enum AS ENUM (
  'invoice','purchase_bill','lr','challan','payment_screenshot',
  'eway_bill','whatsapp_img','other'
);

CREATE TYPE erp_target_enum AS ENUM (
  'tally','zoho','erpnext','odoo','sap','dynamics'
);

-- ============================================================
-- COMPANIES (Public schema — shared across all tenants)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(200) NOT NULL,
  legal_name          VARCHAR(200),
  gstin               VARCHAR(15) UNIQUE,
  pan                 VARCHAR(10),
  state_code          VARCHAR(2) DEFAULT '24',  -- 24 = Gujarat
  address             TEXT,
  city                VARCHAR(100),
  state               VARCHAR(100),
  pincode             VARCHAR(6),
  phone               VARCHAR(15),
  email               VARCHAR(100),
  db_schema           VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'co_abc_pvt_ltd'
  plan                VARCHAR(20) DEFAULT 'starter', -- starter/sme/factory/enterprise
  ai_credits          INT DEFAULT 100,
  tally_config        JSONB DEFAULT '{}',
  whatsapp_token      TEXT,  -- Encrypted
  subscription_start  DATE DEFAULT CURRENT_DATE,
  subscription_expiry DATE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (Public schema) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(15) UNIQUE NOT NULL,
  name            VARCHAR(100),
  email           VARCHAR(100),
  company_id      UUID REFERENCES public.companies(id),
  role            VARCHAR(30) DEFAULT 'accountant',
  -- Roles: super_admin|company_admin|accountant|inventory_manager|
  --        production_supervisor|sales_rep|warehouse_operator
  is_active       BOOLEAN DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_company ON public.users(company_id);

-- ── OTP Sessions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.otp_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(15) NOT NULL,
  otp_hash    VARCHAR(100) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON public.otp_sessions(phone, expires_at);

-- ============================================================
-- COMPANY SCHEMA TABLES (created per-tenant)
-- All tables below are created inside each company's schema
-- ============================================================

-- ── Parties (Customers + Suppliers) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_code      VARCHAR(20) UNIQUE,  -- Auto-generated: CUST0001, SUPP0001
  party_type      VARCHAR(20) NOT NULL, -- customer|supplier|both|transporter
  name            VARCHAR(200) NOT NULL,
  gstin           VARCHAR(15),
  pan             VARCHAR(10),
  phone           VARCHAR(15),
  email           VARCHAR(100),
  whatsapp        VARCHAR(15),
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  state_code      VARCHAR(2),
  pincode         VARCHAR(6),
  credit_limit    NUMERIC(14,2) DEFAULT 0,
  credit_days     INT DEFAULT 30,
  tally_ledger    VARCHAR(200),  -- Tally ledger name mapping
  balance         NUMERIC(14,2) DEFAULT 0,  -- Current outstanding
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_parties_name_trgm ON parties USING gin(name gin_trgm_ops);
CREATE INDEX idx_parties_gstin ON parties(gstin) WHERE gstin IS NOT NULL;
CREATE INDEX idx_parties_type ON parties(party_type);

-- ── Item Master ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS item_master (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code       VARCHAR(50) UNIQUE NOT NULL,
  item_name       VARCHAR(200) NOT NULL,
  item_group      VARCHAR(100) DEFAULT 'General',
  hsn_code        VARCHAR(8),
  gst_rate        NUMERIC(4,1) DEFAULT 18.0,
  unit            VARCHAR(10) DEFAULT 'KG',
  secondary_unit  VARCHAR(10),
  conversion_factor NUMERIC(10,4) DEFAULT 1,  -- 1 BAG = 25 KG
  reorder_level   NUMERIC(12,3) DEFAULT 0,
  standard_rate   NUMERIC(12,4),  -- Standard purchase price
  mrp             NUMERIC(12,4),  -- MRP / list price
  aliases         TEXT[] DEFAULT '{}',  -- AI matching aliases
  is_produced     BOOLEAN DEFAULT FALSE,  -- Has BOM?
  is_purchased    BOOLEAN DEFAULT TRUE,
  is_sold         BOOLEAN DEFAULT TRUE,
  tally_item      VARCHAR(200),  -- Tally stock item name
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_item_code ON item_master(item_code);
CREATE INDEX idx_item_name_trgm ON item_master USING gin(item_name gin_trgm_ops);
CREATE INDEX idx_item_aliases ON item_master USING gin(aliases);

-- ── Warehouses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  address     TEXT,
  city        VARCHAR(100),
  is_default  BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Stock Ledger ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID REFERENCES item_master(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  batch_number    VARCHAR(50),
  movement_type   stock_movement_enum NOT NULL,
  quantity        NUMERIC(12,3) NOT NULL,
  balance_qty     NUMERIC(12,3) NOT NULL,  -- Running balance
  unit_cost       NUMERIC(12,4),
  total_value     NUMERIC(14,2),
  reference_type  VARCHAR(30),  -- voucher|grn|production|transfer
  reference_id    UUID,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  narration       TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_item_wh ON stock_ledger(item_id, warehouse_id);
CREATE INDEX idx_stock_date ON stock_ledger(movement_date);
CREATE INDEX idx_stock_batch ON stock_ledger(batch_number) WHERE batch_number IS NOT NULL;

-- ── Current Stock (materialized view) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_balance (
  item_id         UUID REFERENCES item_master(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  batch_number    VARCHAR(50) NOT NULL DEFAULT '',
  quantity        NUMERIC(12,3) DEFAULT 0,
  avg_cost        NUMERIC(12,4) DEFAULT 0,
  total_value     NUMERIC(14,2) DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (item_id, warehouse_id, batch_number)
);

-- ── Accounting Vouchers ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounting_vouchers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number    VARCHAR(30) UNIQUE NOT NULL,
  voucher_type      voucher_type_enum NOT NULL,
  voucher_date      DATE NOT NULL,
  party_id          UUID REFERENCES parties(id),
  reference_number  VARCHAR(50),
  line_items        JSONB NOT NULL DEFAULT '[]',
  subtotal          NUMERIC(14,2) DEFAULT 0,
  total_cgst        NUMERIC(12,2) DEFAULT 0,
  total_sgst        NUMERIC(12,2) DEFAULT 0,
  total_igst        NUMERIC(12,2) DEFAULT 0,
  total_tds         NUMERIC(12,2) DEFAULT 0,
  total             NUMERIC(14,2) DEFAULT 0,
  narration         TEXT,
  is_gst_invoice    BOOLEAN DEFAULT FALSE,
  irn               VARCHAR(64),  -- e-Invoice IRN
  ewb_number        VARCHAR(20),  -- e-Way Bill number
  is_cancelled      BOOLEAN DEFAULT FALSE,
  tally_synced      BOOLEAN DEFAULT FALSE,
  tally_sync_at     TIMESTAMPTZ,
  tally_voucher_id  VARCHAR(50),
  source_extraction UUID,  -- Link to document_extractions
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voucher_date ON accounting_vouchers(voucher_date);
CREATE INDEX idx_voucher_party ON accounting_vouchers(party_id);
CREATE INDEX idx_voucher_type ON accounting_vouchers(voucher_type);
CREATE INDEX idx_voucher_ref ON accounting_vouchers(reference_number);
CREATE INDEX idx_voucher_unsync ON accounting_vouchers(tally_synced, voucher_date)
  WHERE NOT tally_synced;

-- ── Document Extractions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_key          TEXT NOT NULL,
  filename        VARCHAR(255),
  document_type   doc_type_enum DEFAULT 'invoice',
  status          extraction_status_enum DEFAULT 'pending',
  extracted_data  JSONB,
  confidence_score NUMERIC(5,4),
  corrections     JSONB,
  language        VARCHAR(5),  -- en|hi|gu
  is_duplicate    BOOLEAN DEFAULT FALSE,
  erp_voucher_id  UUID REFERENCES accounting_vouchers(id),
  uploaded_by     UUID,
  verified_by     UUID,
  verified_at     TIMESTAMPTZ,
  processing_ms   INT,  -- AI processing time
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extraction_status ON document_extractions(status);
CREATE INDEX idx_extraction_invoice ON document_extractions
  ((extracted_data->>'invoice_number')) WHERE extracted_data IS NOT NULL;

-- ── Bill of Materials ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bom_headers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_item_id UUID REFERENCES item_master(id),
  bom_name        VARCHAR(100) NOT NULL,
  output_quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  output_unit     VARCHAR(10) DEFAULT 'KG',
  machine_id      UUID,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_components (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id          UUID REFERENCES bom_headers(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES item_master(id),
  quantity        NUMERIC(12,4) NOT NULL,
  unit            VARCHAR(10) DEFAULT 'KG',
  wastage_pct     NUMERIC(5,2) DEFAULT 0,
  seq_no          INT DEFAULT 0
);

-- ── Production Orders ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    VARCHAR(30) UNIQUE NOT NULL,
  bom_id          UUID REFERENCES bom_headers(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  planned_qty     NUMERIC(12,3) NOT NULL,
  actual_qty      NUMERIC(12,3),
  wastage_qty     NUMERIC(12,3),
  status          production_status_enum DEFAULT 'planned',
  machine_id      UUID,
  operator_id     UUID,
  shift           VARCHAR(10),  -- A|B|Night
  planned_date    DATE NOT NULL,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prod_status ON production_orders(status);
CREATE INDEX idx_prod_date ON production_orders(planned_date);

-- ── Sales Orders ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    VARCHAR(30) UNIQUE NOT NULL,
  customer_id     UUID REFERENCES parties(id),
  status          order_status_enum DEFAULT 'draft',
  order_date      DATE NOT NULL,
  delivery_date   DATE,
  po_number       VARCHAR(50),
  line_items      JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(14,2) DEFAULT 0,
  total_gst       NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(14,2) DEFAULT 0,
  delivery_addr   JSONB,
  terms           TEXT,
  voucher_id      UUID REFERENCES accounting_vouchers(id),
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transport / LR Records ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transport_lr (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lr_number           VARCHAR(50) NOT NULL,
  lr_date             DATE NOT NULL,
  transporter_id      UUID REFERENCES parties(id),
  vehicle_number      VARCHAR(20),
  consignor_id        UUID REFERENCES parties(id),
  consignee_id        UUID REFERENCES parties(id),
  origin              VARCHAR(100),
  destination         VARCHAR(100),
  freight_amount      NUMERIC(12,2) DEFAULT 0,
  freight_paid_by     VARCHAR(20) DEFAULT 'consignor',  -- consignor|consignee|to_pay
  weight_kg           NUMERIC(10,2),
  status              VARCHAR(20) DEFAULT 'loaded',
  -- Status: loaded|in_transit|delivered|returned
  actual_delivery     DATE,
  pod_s3_key          TEXT,  -- Proof of delivery document
  reference_voucher   UUID REFERENCES accounting_vouchers(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lr_number ON transport_lr(lr_number);
CREATE INDEX idx_lr_transporter ON transport_lr(transporter_id);
CREATE INDEX idx_lr_status ON transport_lr(status);

-- ── ERP Sync Log ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target          erp_target_enum NOT NULL,
  record_type     VARCHAR(30) NOT NULL,  -- voucher|ledger|stock|party
  record_id       UUID NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',  -- pending|success|failed
  target_id       VARCHAR(100),  -- ID in the ERP system
  error_message   TEXT,
  retry_count     INT DEFAULT 0,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_record ON erp_sync_log(record_id);
CREATE INDEX idx_sync_status ON erp_sync_log(status, target);
CREATE INDEX idx_sync_unsync ON erp_sync_log(status, created_at)
  WHERE status IN ('pending', 'failed');

-- ── Audit Log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  user_name   VARCHAR(100),
  action      VARCHAR(50) NOT NULL,
  table_name  VARCHAR(50),
  record_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);

-- ── Outstanding (View) ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW outstanding_summary AS
SELECT
  p.id as party_id,
  p.name as party_name,
  p.party_type,
  p.phone,
  COUNT(av.id) as invoice_count,
  SUM(CASE WHEN av.voucher_type IN ('sales','receipt') THEN av.total ELSE 0 END) -
  SUM(CASE WHEN av.voucher_type = 'receipt' THEN av.total ELSE 0 END) as receivable,
  SUM(CASE WHEN av.voucher_type IN ('purchase','payment') THEN av.total ELSE 0 END) -
  SUM(CASE WHEN av.voucher_type = 'payment' THEN av.total ELSE 0 END) as payable,
  MAX(av.voucher_date) as last_transaction
FROM parties p
LEFT JOIN accounting_vouchers av ON av.party_id = p.id AND NOT av.is_cancelled
GROUP BY p.id, p.name, p.party_type, p.phone;

-- ── Helper Functions ──────────────────────────────────────────────────────────

-- Auto-generate voucher numbers
CREATE OR REPLACE FUNCTION next_voucher_number(prefix TEXT, fy_year INT)
RETURNS TEXT AS $$
DECLARE
  seq INT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(voucher_number FROM '\d+$')::INT), 0) + 1
  INTO seq
  FROM accounting_vouchers
  WHERE voucher_number LIKE prefix || fy_year || '/%';
  RETURN prefix || fy_year || '/' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update stock balance on each ledger entry
CREATE OR REPLACE FUNCTION update_stock_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_balance (item_id, warehouse_id, batch_number, quantity, last_updated)
  VALUES (NEW.item_id, NEW.warehouse_id, COALESCE(NEW.batch_number, ''), NEW.balance_qty, NOW())
  ON CONFLICT (item_id, warehouse_id, batch_number)
  DO UPDATE SET quantity = NEW.balance_qty, last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock_balance
  AFTER INSERT ON stock_ledger
  FOR EACH ROW EXECUTE FUNCTION update_stock_balance();

-- ── Indexes for performance ────────────────────────────────────────────────────

-- Full-text search on party names
CREATE INDEX idx_party_name_gin ON parties USING gin(to_tsvector('english', name));

-- Stock balance lookup
CREATE INDEX idx_stock_bal ON stock_balance(item_id, warehouse_id);

-- Voucher number sequence lookup
CREATE INDEX idx_voucher_num_prefix ON accounting_vouchers
  (SUBSTRING(voucher_number, 1, 4), voucher_date DESC);
