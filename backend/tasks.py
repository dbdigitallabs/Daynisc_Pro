"""
Celery Task Queue
Handles async AI processing, ERP sync, and notification jobs.
"""
from __future__ import annotations
import asyncio
import time
from datetime import datetime

from celery import Celery
from celery.utils.log import get_task_logger

from shared.config import settings

# ── Celery app ────────────────────────────────────────────────────────────────

celery_app = Celery(
    "ai_erp",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # Fair distribution
    broker_connection_retry_on_startup=True,
    task_routes={
        "tasks.process_document_task": {"queue": "ai"},
        "tasks.create_erp_entries_task": {"queue": "erp"},
        "tasks.sync_to_tally_task": {"queue": "erp"},
        "tasks.send_whatsapp_task": {"queue": "notifications"},
        "tasks.send_payment_reminder_task": {"queue": "notifications"},
        "tasks.bulk_sync_task": {"queue": "erp"},
    },
    beat_schedule={
        # Daily: send payment reminders for overdue invoices
        "daily-payment-reminders": {
            "task": "tasks.daily_payment_reminders",
            "schedule": 86400,  # Every 24h
        },
        # Every 5 min: retry failed Tally syncs
        "retry-failed-syncs": {
            "task": "tasks.retry_failed_erp_syncs",
            "schedule": 300,
        },
        # Every hour: low stock alert check
        "low-stock-check": {
            "task": "tasks.check_low_stock_alerts",
            "schedule": 3600,
        },
    },
)

logger = get_task_logger(__name__)


# ── Helper: run async functions in Celery ─────────────────────────────────────

def run_async(coro):
    """Run an async coroutine from a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ── Task 1: AI Document Processing ───────────────────────────────────────────

@celery_app.task(
    name="tasks.process_document_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="ai",
)
def process_document_task(
    self,
    extraction_id: str,
    s3_key: str,
    mime_type: str,
    document_type: str,
    language: str,
    company_id: str,
    schema: str,
):
    """Download document from S3, run AI extraction, update DB."""
    start = time.monotonic()
    logger.info(f"Processing document {extraction_id}")

    try:
        result = run_async(_process_document(
            extraction_id, s3_key, mime_type,
            document_type, language, company_id, schema,
        ))
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.info(f"Document {extraction_id} processed in {elapsed_ms}ms, confidence={result.get('confidence', {}).get('overall', 0):.2f}")
        return {"status": "success", "extraction_id": extraction_id}

    except Exception as exc:
        logger.error(f"Document processing failed for {extraction_id}: {exc}")
        # Update DB status to failed
        run_async(_mark_extraction_failed(extraction_id, str(exc), schema))
        raise self.retry(exc=exc)


async def _process_document(
    extraction_id, s3_key, mime_type,
    document_type, language, company_id, schema
):
    from services.document_service.ai_extractor import ai_extractor
    from shared.storage import download_from_s3
    from shared.database import AsyncSessionFactory
    from sqlalchemy import text
    import json

    # 1. Download from S3
    file_bytes = await download_from_s3(s3_key)

    # 2. Run AI extraction
    extracted = await ai_extractor.extract(
        image_bytes=file_bytes,
        mime_type=mime_type,
        language_hint=language,
        document_type_hint=document_type,
    )

    confidence = extracted.get("confidence", {}).get("overall", 0)

    # 3. Check for duplicates
    is_duplicate = False
    invoice_num = extracted.get("invoice_number")
    if invoice_num:
        async with AsyncSessionFactory() as session:
            await session.execute(text(f"SET search_path TO {schema}, public"))
            res = await session.execute(text("""
                SELECT COUNT(*) FROM document_extractions
                WHERE extracted_data->>'invoice_number' = :inv
                  AND id != :id AND status != 'failed'
            """), {"inv": invoice_num, "id": extraction_id})
            count = res.scalar()
            is_duplicate = (count or 0) > 0

    # 4. Save to DB
    async with AsyncSessionFactory() as session:
        await session.execute(text(f"SET search_path TO {schema}, public"))
        await session.execute(text("""
            UPDATE document_extractions
            SET status = :status,
                extracted_data = :data::jsonb,
                confidence_score = :confidence,
                is_duplicate = :is_dup,
                processing_ms = :ms,
                updated_at = NOW()
            WHERE id = :id
        """), {
            "id": extraction_id,
            "status": "extracted",
            "data": json.dumps(extracted, default=str),
            "confidence": confidence,
            "is_dup": is_duplicate,
            "ms": 0,
        })
        await session.commit()

    # 5. Auto-approve if confidence high enough and not duplicate
    if confidence >= 0.85 and not is_duplicate:
        create_erp_entries_task.delay(
            extraction_id=extraction_id,
            company_id=company_id,
            schema=schema,
        )

    return extracted


async def _mark_extraction_failed(extraction_id: str, error: str, schema: str):
    from shared.database import AsyncSessionFactory
    from sqlalchemy import text
    async with AsyncSessionFactory() as session:
        await session.execute(text(f"SET search_path TO {schema}, public"))
        await session.execute(text("""
            UPDATE document_extractions
            SET status = 'failed', updated_at = NOW()
            WHERE id = :id
        """), {"id": extraction_id})
        await session.commit()


# ── Task 2: Create ERP Entries from Extraction ────────────────────────────────

@celery_app.task(
    name="tasks.create_erp_entries_task",
    bind=True,
    max_retries=2,
    queue="erp",
)
def create_erp_entries_task(self, extraction_id: str, company_id: str, schema: str):
    """Create accounting voucher + stock entries from verified extraction."""
    logger.info(f"Creating ERP entries for extraction {extraction_id}")
    try:
        result = run_async(_create_erp_entries(extraction_id, company_id, schema))
        return result
    except Exception as exc:
        logger.error(f"ERP entry creation failed: {exc}")
        raise self.retry(exc=exc)


async def _create_erp_entries(extraction_id: str, company_id: str, schema: str):
    from shared.database import AsyncSessionFactory
    from sqlalchemy import text
    import json, uuid

    async with AsyncSessionFactory() as session:
        await session.execute(text(f"SET search_path TO {schema}, public"))

        # Fetch extraction
        res = await session.execute(text("""
            SELECT extracted_data, document_type FROM document_extractions
            WHERE id = :id
        """), {"id": extraction_id})
        row = res.fetchone()
        if not row:
            return {"error": "Extraction not found"}

        data = row.extracted_data
        doc_type = row.document_type

        if doc_type in ("invoice", "purchase_bill"):
            # Map to party
            party_res = await session.execute(text("""
                SELECT id FROM parties
                WHERE name ILIKE :name OR gstin = :gstin
                LIMIT 1
            """), {
                "name": f"%{data.get('party_name', '')}%",
                "gstin": data.get("party_gstin") or "",
            })
            party = party_res.fetchone()
            party_id = str(party.id) if party else None

            # Determine voucher type
            v_type = "sales" if doc_type == "invoice" else "purchase"

            # Get next voucher number
            prefix = "SAL" if v_type == "sales" else "PUR"
            fy = datetime.now().year

            num_res = await session.execute(text(
                "SELECT next_voucher_number(:prefix, :fy)"
            ), {"prefix": prefix, "fy": fy})
            voucher_number = num_res.scalar()

            voucher_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO accounting_vouchers
                    (id, voucher_number, voucher_type, voucher_date,
                     party_id, reference_number, line_items,
                     subtotal, total_cgst, total_sgst, total_igst, total,
                     source_extraction, created_at)
                VALUES
                    (:id, :num, :vtype::voucher_type_enum, :date::date,
                     :party_id, :ref, :items::jsonb,
                     :subtotal, :cgst, :sgst, :igst, :total,
                     :source, NOW())
            """), {
                "id": voucher_id,
                "num": voucher_number,
                "vtype": v_type,
                "date": data.get("invoice_date") or "today",
                "party_id": party_id,
                "ref": data.get("invoice_number"),
                "items": json.dumps(data.get("line_items", []), default=str),
                "subtotal": data.get("subtotal") or 0,
                "cgst": data.get("total_cgst") or 0,
                "sgst": data.get("total_sgst") or 0,
                "igst": data.get("total_igst") or 0,
                "total": data.get("total_amount") or 0,
                "source": extraction_id,
            })

            # Update extraction status
            await session.execute(text("""
                UPDATE document_extractions
                SET status = 'pushed', erp_voucher_id = :vid, updated_at = NOW()
                WHERE id = :id
            """), {"vid": voucher_id, "id": extraction_id})

            await session.commit()

            # Queue Tally sync
            sync_to_tally_task.delay(
                voucher_id=voucher_id,
                company_id=company_id,
                schema=schema,
            )

            return {"voucher_id": voucher_id, "voucher_number": voucher_number}

    return {"status": "skipped", "reason": f"No handler for doc_type: {doc_type}"}


# ── Task 3: Tally Sync ────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.sync_to_tally_task",
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    queue="erp",
)
def sync_to_tally_task(self, voucher_id: str, company_id: str, schema: str):
    """Push a single voucher to TallyPrime."""
    logger.info(f"Syncing voucher {voucher_id} to Tally")
    try:
        result = run_async(_sync_to_tally(voucher_id, company_id, schema))
        return result
    except Exception as exc:
        logger.error(f"Tally sync failed for {voucher_id}: {exc}")
        raise self.retry(exc=exc, countdown=min(60 * (2 ** self.request.retries), 3600))


async def _sync_to_tally(voucher_id: str, company_id: str, schema: str):
    from shared.database import AsyncSessionFactory
    from services.erp_connector.tally_connector import TallyConnector
    from sqlalchemy import text

    async with AsyncSessionFactory() as session:
        await session.execute(text(f"SET search_path TO {schema}, public"))

        # Fetch voucher
        res = await session.execute(text("""
            SELECT av.*, p.name as party_name, p.gstin,
                   c.tally_config
            FROM accounting_vouchers av
            LEFT JOIN parties p ON p.id = av.party_id
            CROSS JOIN (SELECT tally_config FROM public.companies WHERE id = :cid) c
            WHERE av.id = :vid
        """), {"vid": voucher_id, "cid": company_id})
        row = res.fetchone()
        if not row:
            return {"error": "Voucher not found"}

        # Build Tally connector
        tally_conf = row.tally_config or {}
        connector = TallyConnector(
            tally_url=tally_conf.get("url", ""),
            company_name=tally_conf.get("company_name", ""),
        )

        # Build voucher dict
        v = {
            "voucher_date": row.voucher_date,
            "reference_number": row.reference_number,
            "party_name": row.party_name,
            "narration": row.narration,
            "line_items": row.line_items or [],
            "total": float(row.total or 0),
        }

        if row.voucher_type == "purchase":
            tally_result = await connector.push_purchase_voucher(v)
        elif row.voucher_type == "sales":
            tally_result = await connector.push_sales_voucher(v)
        elif row.voucher_type == "payment":
            tally_result = await connector.push_payment_voucher(v)
        elif row.voucher_type == "receipt":
            tally_result = await connector.push_receipt_voucher(v)
        else:
            return {"skipped": True, "reason": f"No Tally mapper for {row.voucher_type}"}

        # Update sync status
        await session.execute(text("""
            UPDATE accounting_vouchers
            SET tally_synced = TRUE, tally_sync_at = NOW()
            WHERE id = :id
        """), {"id": voucher_id})
        await session.commit()

        return {"success": True, "tally_result": tally_result}


# ── Task 4: WhatsApp message ──────────────────────────────────────────────────

@celery_app.task(name="tasks.send_whatsapp_task", queue="notifications")
def send_whatsapp_task(phone: str, template: str, params: dict, token: str):
    """Send a WhatsApp Business API message."""
    import httpx
    result = run_async(_send_wa(phone, template, params, token))
    return result


async def _send_wa(phone: str, template: str, params: dict, token: str):
    import httpx
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template,
            "language": {"code": "en_IN"},
            "components": [{"type": "body", "parameters": [
                {"type": "text", "text": str(v)} for v in params.values()
            ]}],
        },
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/messages",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()


# ── Task 5: Daily payment reminders ──────────────────────────────────────────

@celery_app.task(name="tasks.daily_payment_reminders")
def daily_payment_reminders():
    """Send payment reminders for overdue invoices across all active companies."""
    logger.info("Running daily payment reminders")
    run_async(_send_all_reminders())


async def _send_all_reminders():
    from shared.database import AsyncSessionFactory
    from sqlalchemy import text

    async with AsyncSessionFactory() as session:
        # Get all active companies with WhatsApp token
        res = await session.execute(text("""
            SELECT id, db_schema, whatsapp_token
            FROM public.companies
            WHERE is_active = TRUE
              AND subscription_expiry >= CURRENT_DATE
              AND whatsapp_token IS NOT NULL
        """))
        companies = res.fetchall()

    for co in companies:
        await _send_company_reminders(co.id, co.db_schema, co.whatsapp_token)


async def _send_company_reminders(company_id, schema, wa_token):
    """Send reminders for a single company's overdue customers."""
    from shared.database import AsyncSessionFactory
    from sqlalchemy import text

    async with AsyncSessionFactory() as session:
        await session.execute(text(f"SET search_path TO {schema}, public"))
        res = await session.execute(text("""
            SELECT p.name, p.whatsapp, os.receivable,
                   CURRENT_DATE - MAX(av.voucher_date) as overdue_days
            FROM outstanding_summary os
            JOIN parties p ON p.id = os.party_id
            JOIN accounting_vouchers av ON av.party_id = p.id
              AND av.voucher_type = 'sales'
            WHERE os.receivable > 0
              AND p.whatsapp IS NOT NULL
              AND os.party_type = 'customer'
            GROUP BY p.name, p.whatsapp, os.receivable
            HAVING CURRENT_DATE - MAX(av.voucher_date) >= 7
        """))
        overdue = res.fetchall()

    for party in overdue:
        send_whatsapp_task.delay(
            phone=f"91{party.whatsapp}",
            template="payment_reminder",
            params={
                "name": party.name,
                "amount": f"₹{int(party.receivable):,}",
                "days": str(party.overdue_days),
            },
            token=wa_token,
        )


# ── Task 6: Retry failed ERP syncs ────────────────────────────────────────────

@celery_app.task(name="tasks.retry_failed_erp_syncs")
def retry_failed_erp_syncs():
    """Re-queue any vouchers that failed Tally sync."""
    run_async(_retry_syncs())


async def _retry_syncs():
    from shared.database import AsyncSessionFactory
    from sqlalchemy import text

    async with AsyncSessionFactory() as session:
        res = await session.execute(text("""
            SELECT av.id, c.id as company_id, c.db_schema
            FROM accounting_vouchers av
            JOIN public.companies c ON TRUE
            WHERE av.tally_synced = FALSE
              AND av.created_at >= NOW() - INTERVAL '7 days'
            LIMIT 100
        """))
        unsynced = res.fetchall()

    for row in unsynced:
        sync_to_tally_task.delay(
            voucher_id=str(row.id),
            company_id=str(row.company_id),
            schema=row.db_schema,
        )
    logger.info(f"Re-queued {len(unsynced)} failed Tally syncs")
