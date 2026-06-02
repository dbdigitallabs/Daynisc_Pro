"""Company schema provision — all tenant tables

Revision ID: 003_tenant_schema_tables
Revises: 002_add_sales_purchase_tables
Create Date: 2025-01-01 00:00:00

This migration creates all tables inside a company/tenant schema.
It is run via: alembic -x schema=co_xyz upgrade head
"""
from alembic import op
import sqlalchemy as sa


revision = '003_tenant_schema_tables'
down_revision = '002_add_sales_purchase_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Creates the full table set inside the current schema (tenant-specific).
    The schema must already exist — created by database.provision_company_schema().
    """

    # ── Parties ───────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS parties (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            party_code      VARCHAR(20) UNIQUE,
            party_type      VARCHAR(20) NOT NULL DEFAULT 'customer',
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
            tally_ledger    VARCHAR(200),
            balance         NUMERIC(14,2) DEFAULT 0,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW(),
            is_active       BOOLEAN DEFAULT TRUE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_parties_name_trgm ON parties USING gin(name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parties_gstin ON parties(gstin) WHERE gstin IS NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(party_type)")

    # ── Warehouses ────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS warehouses (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(100) NOT NULL,
            address     TEXT,
            city        VARCHAR(100),
            is_default  BOOLEAN DEFAULT FALSE,
            is_active   BOOLEAN DEFAULT TRUE,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("INSERT INTO warehouses (name, is_default) VALUES ('Main Warehouse', TRUE) ON CONFLICT DO NOTHING")

    # ── Item Master ───────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS item_master (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            item_code       VARCHAR(50) UNIQUE NOT NULL,
            item_name       VARCHAR(200) NOT NULL,
            item_group      VARCHAR(100) DEFAULT 'General',
            hsn_code        VARCHAR(8),
            gst_rate        NUMERIC(4,1) DEFAULT 18.0,
            unit            VARCHAR(10) DEFAULT 'KG',
            secondary_unit  VARCHAR(10),
            conversion_factor NUMERIC(10,4) DEFAULT 1,
            reorder_level   NUMERIC(12,3) DEFAULT 0,
            standard_rate   NUMERIC(12,4),
            mrp             NUMERIC(12,4),
            aliases         TEXT[] DEFAULT '{}',
            is_produced     BOOLEAN DEFAULT FALSE,
            is_purchased    BOOLEAN DEFAULT TRUE,
            is_sold         BOOLEAN DEFAULT TRUE,
            tally_item      VARCHAR(200),
            is_active       BOOLEAN DEFAULT TRUE,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_item_name_trgm ON item_master USING gin(item_name gin_trgm_ops)")

    # ── Stock Ledger ──────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS stock_ledger (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            item_id         UUID REFERENCES item_master(id),
            warehouse_id    UUID REFERENCES warehouses(id),
            batch_number    VARCHAR(50),
            movement_type   stock_movement_enum NOT NULL,
            quantity        NUMERIC(12,3) NOT NULL,
            balance_qty     NUMERIC(12,3) NOT NULL,
            unit_cost       NUMERIC(12,4),
            total_value     NUMERIC(14,2),
            reference_type  VARCHAR(30),
            reference_id    UUID,
            movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
            narration       TEXT,
            created_by      UUID,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_stock_item_wh ON stock_ledger(item_id, warehouse_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_stock_date ON stock_ledger(movement_date)")

    # ── Stock Balance ─────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS stock_balance (
            item_id         UUID REFERENCES item_master(id),
            warehouse_id    UUID REFERENCES warehouses(id),
            batch_number    VARCHAR(50) DEFAULT '',
            quantity        NUMERIC(12,3) DEFAULT 0,
            avg_cost        NUMERIC(12,4) DEFAULT 0,
            total_value     NUMERIC(14,2) DEFAULT 0,
            last_updated    TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (item_id, warehouse_id, batch_number)
        )
    """)

    # ── Auto-update stock_balance trigger ─────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_stock_balance()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO stock_balance
                (item_id, warehouse_id, batch_number, quantity, last_updated)
            VALUES
                (NEW.item_id, NEW.warehouse_id, COALESCE(NEW.batch_number, ''),
                 NEW.balance_qty, NOW())
            ON CONFLICT (item_id, warehouse_id, batch_number)
            DO UPDATE SET quantity = NEW.balance_qty, last_updated = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    op.execute("""
        DROP TRIGGER IF EXISTS trg_update_stock_balance ON stock_ledger;
        CREATE TRIGGER trg_update_stock_balance
            AFTER INSERT ON stock_ledger
            FOR EACH ROW EXECUTE FUNCTION update_stock_balance()
    """)

    # ── Accounting Vouchers ───────────────────────────────────────────────────
    op.execute("""
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
            irn               VARCHAR(64),
            ewb_number        VARCHAR(20),
            is_cancelled      BOOLEAN DEFAULT FALSE,
            tally_synced      BOOLEAN DEFAULT FALSE,
            tally_sync_at     TIMESTAMPTZ,
            tally_voucher_id  VARCHAR(50),
            source_extraction UUID,
            created_by        UUID,
            created_at        TIMESTAMPTZ DEFAULT NOW(),
            updated_at        TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_voucher_date ON accounting_vouchers(voucher_date)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_voucher_party ON accounting_vouchers(party_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_voucher_type ON accounting_vouchers(voucher_type)")
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_voucher_unsync
        ON accounting_vouchers(tally_synced, voucher_date)
        WHERE NOT tally_synced
    """)

    # ── Voucher number sequence function ──────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION next_voucher_number(prefix TEXT, fy_year INT)
        RETURNS TEXT AS $$
        DECLARE seq INT;
        BEGIN
            SELECT COALESCE(
                MAX(SUBSTRING(voucher_number FROM '\\d+$')::INT), 0
            ) + 1
            INTO seq
            FROM accounting_vouchers
            WHERE voucher_number LIKE prefix || fy_year || '/%';
            RETURN prefix || fy_year || '/' || LPAD(seq::TEXT, 4, '0');
        END;
        $$ LANGUAGE plpgsql
    """)

    # ── Outstanding summary view ──────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE VIEW outstanding_summary AS
        SELECT
            p.id as party_id,
            p.name as party_name,
            p.party_type,
            p.phone,
            p.credit_days,
            COUNT(av.id) as invoice_count,
            COALESCE(SUM(CASE WHEN av.voucher_type = 'sales' THEN av.total ELSE 0 END), 0)
                - COALESCE(SUM(CASE WHEN av.voucher_type = 'receipt' THEN av.total ELSE 0 END), 0)
                as receivable,
            COALESCE(SUM(CASE WHEN av.voucher_type = 'purchase' THEN av.total ELSE 0 END), 0)
                - COALESCE(SUM(CASE WHEN av.voucher_type = 'payment' THEN av.total ELSE 0 END), 0)
                as payable,
            MAX(av.voucher_date) as last_transaction
        FROM parties p
        LEFT JOIN accounting_vouchers av ON av.party_id = p.id AND NOT av.is_cancelled
        GROUP BY p.id, p.name, p.party_type, p.phone, p.credit_days
    """)

    # ── Document Extractions ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_extractions (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            s3_key           TEXT NOT NULL,
            filename         VARCHAR(255),
            document_type    doc_type_enum DEFAULT 'invoice',
            status           extraction_status_enum DEFAULT 'pending',
            extracted_data   JSONB,
            confidence_score NUMERIC(5,4),
            corrections      JSONB,
            language         VARCHAR(5),
            is_duplicate     BOOLEAN DEFAULT FALSE,
            erp_voucher_id   UUID REFERENCES accounting_vouchers(id),
            uploaded_by      UUID,
            verified_by      UUID,
            verified_at      TIMESTAMPTZ,
            processing_ms    INT,
            created_at       TIMESTAMPTZ DEFAULT NOW(),
            updated_at       TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_extraction_status ON document_extractions(status)")

    # ── BOM ───────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS bom_headers (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            finished_item_id UUID REFERENCES item_master(id),
            bom_name         VARCHAR(100) NOT NULL,
            output_quantity  NUMERIC(12,3) NOT NULL DEFAULT 1,
            output_unit      VARCHAR(10) DEFAULT 'KG',
            machine_id       UUID,
            is_active        BOOLEAN DEFAULT TRUE,
            notes            TEXT,
            created_at       TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bom_components (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bom_id      UUID REFERENCES bom_headers(id) ON DELETE CASCADE,
            item_id     UUID REFERENCES item_master(id),
            quantity    NUMERIC(12,4) NOT NULL,
            unit        VARCHAR(10) DEFAULT 'KG',
            wastage_pct NUMERIC(5,2) DEFAULT 0,
            seq_no      INT DEFAULT 0
        )
    """)

    # ── Production Orders ─────────────────────────────────────────────────────
    op.execute("""
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
            shift           VARCHAR(10),
            planned_date    DATE NOT NULL,
            started_at      TIMESTAMPTZ,
            completed_at    TIMESTAMPTZ,
            notes           TEXT,
            created_by      UUID,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_prod_status ON production_orders(status)")

    # ── Transport LR ──────────────────────────────────────────────────────────
    op.execute("""
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
            freight_paid_by     VARCHAR(20) DEFAULT 'consignor',
            weight_kg           NUMERIC(10,2),
            status              VARCHAR(20) DEFAULT 'loaded',
            actual_delivery     DATE,
            pod_s3_key          TEXT,
            reference_voucher   UUID REFERENCES accounting_vouchers(id),
            notes               TEXT,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_lr_number ON transport_lr(lr_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_lr_status ON transport_lr(status)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS transport_lr CASCADE")
    op.execute("DROP TABLE IF EXISTS production_orders CASCADE")
    op.execute("DROP TABLE IF EXISTS bom_components CASCADE")
    op.execute("DROP TABLE IF EXISTS bom_headers CASCADE")
    op.execute("DROP TABLE IF EXISTS document_extractions CASCADE")
    op.execute("DROP VIEW IF EXISTS outstanding_summary")
    op.execute("DROP TABLE IF EXISTS accounting_vouchers CASCADE")
    op.execute("DROP TABLE IF EXISTS stock_balance CASCADE")
    op.execute("DROP TABLE IF EXISTS stock_ledger CASCADE")
    op.execute("DROP TABLE IF EXISTS item_master CASCADE")
    op.execute("DROP TABLE IF EXISTS warehouses CASCADE")
    op.execute("DROP TABLE IF EXISTS parties CASCADE")
