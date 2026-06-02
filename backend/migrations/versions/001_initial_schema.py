"""Initial migration — public schema (companies, users, otp_sessions)

Revision ID: 001_initial_schema
Revises: 
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # ── ENUM types (public schema) ────────────────────────────────────────────
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE erp_target_enum AS ENUM
                ('tally','zoho','erpnext','odoo','sap','dynamics');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE voucher_type_enum AS ENUM
                ('purchase','sales','payment','receipt','journal','debit_note','credit_note');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE stock_movement_enum AS ENUM
                ('inward','outward','transfer','adjustment',
                 'production_consumption','production_output');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_status_enum AS ENUM
                ('draft','confirmed','dispatched','delivered','cancelled','closed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE production_status_enum AS ENUM
                ('planned','in_progress','completed','on_hold','cancelled');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE extraction_status_enum AS ENUM
                ('pending','extracted','verified','review','pushed','failed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE doc_type_enum AS ENUM
                ('invoice','purchase_bill','lr','challan','payment_screenshot',
                 'eway_bill','whatsapp_img','other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    # ── Companies ─────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.companies (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name                VARCHAR(200) NOT NULL,
            legal_name          VARCHAR(200),
            gstin               VARCHAR(15) UNIQUE,
            pan                 VARCHAR(10),
            state_code          VARCHAR(2) DEFAULT '24',
            address             TEXT,
            city                VARCHAR(100),
            state               VARCHAR(100),
            pincode             VARCHAR(6),
            phone               VARCHAR(15),
            email               VARCHAR(100),
            db_schema           VARCHAR(50) UNIQUE NOT NULL,
            plan                VARCHAR(20) DEFAULT 'starter',
            ai_credits          INT DEFAULT 100,
            tally_config        JSONB DEFAULT '{}',
            whatsapp_token      TEXT,
            subscription_start  DATE DEFAULT CURRENT_DATE,
            subscription_expiry DATE,
            is_active           BOOLEAN DEFAULT TRUE,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # ── Users ─────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.users (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone       VARCHAR(15) UNIQUE NOT NULL,
            name        VARCHAR(100),
            email       VARCHAR(100),
            company_id  UUID REFERENCES public.companies(id),
            role        VARCHAR(30) DEFAULT 'accountant',
            is_active   BOOLEAN DEFAULT TRUE,
            last_login  TIMESTAMPTZ,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id)")

    # ── OTP Sessions ──────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.otp_sessions (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone       VARCHAR(15) NOT NULL,
            otp_hash    VARCHAR(100) NOT NULL,
            expires_at  TIMESTAMPTZ NOT NULL,
            used        BOOLEAN DEFAULT FALSE,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.otp_sessions(phone, expires_at)")

    # ── Audit Log (public schema — partitioned by month) ─────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.audit_log (
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
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.audit_log")
    op.execute("DROP TABLE IF EXISTS public.otp_sessions")
    op.execute("DROP TABLE IF EXISTS public.users")
    op.execute("DROP TABLE IF EXISTS public.companies")
