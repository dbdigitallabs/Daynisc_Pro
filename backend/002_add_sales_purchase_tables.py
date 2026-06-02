"""Add purchase_orders, sales_orders, goods_receipt_notes tables

Revision ID: 002_add_sales_purchase_tables
Revises: 001_initial_schema
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '002_add_sales_purchase_tables'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Purchase Orders ───────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_number    VARCHAR(30) UNIQUE NOT NULL,
            supplier_id     UUID REFERENCES parties(id),
            order_date      DATE NOT NULL,
            expected_delivery DATE,
            line_items      JSONB NOT NULL DEFAULT '[]',
            subtotal        NUMERIC(14,2) DEFAULT 0,
            total           NUMERIC(14,2) DEFAULT 0,
            status          VARCHAR(20) DEFAULT 'confirmed',
            terms           TEXT,
            created_by      UUID,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # ── Sales Orders ──────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS sales_orders (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_number    VARCHAR(30) UNIQUE NOT NULL,
            customer_id     UUID REFERENCES parties(id),
            status          order_status_enum DEFAULT 'confirmed',
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
        )
    """)

    # ── Goods Receipt Notes ───────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS goods_receipt_notes (
            id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            grn_number               VARCHAR(30) UNIQUE NOT NULL,
            supplier_id              UUID REFERENCES parties(id),
            purchase_order_id        UUID REFERENCES purchase_orders(id),
            receipt_date             DATE NOT NULL,
            warehouse_id             UUID REFERENCES warehouses(id),
            line_items               JSONB NOT NULL DEFAULT '[]',
            vehicle_number           VARCHAR(20),
            lr_number                VARCHAR(50),
            supplier_invoice_number  VARCHAR(50),
            notes                    TEXT,
            created_by               UUID,
            created_at               TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # ── Dashboard view ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS erp_sync_log (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            target          erp_target_enum NOT NULL,
            record_type     VARCHAR(30) NOT NULL,
            record_id       UUID NOT NULL,
            status          VARCHAR(20) DEFAULT 'pending',
            target_id       VARCHAR(100),
            error_message   TEXT,
            retry_count     INT DEFAULT 0,
            synced_at       TIMESTAMPTZ,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # ── Indexes ───────────────────────────────────────────────────────────────
    op.execute("CREATE INDEX IF NOT EXISTS idx_so_customer ON sales_orders(customer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_grn_supplier ON goods_receipt_notes(supplier_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sync_status ON erp_sync_log(status, target)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS erp_sync_log")
    op.execute("DROP TABLE IF EXISTS goods_receipt_notes")
    op.execute("DROP TABLE IF EXISTS sales_orders")
    op.execute("DROP TABLE IF EXISTS purchase_orders")
