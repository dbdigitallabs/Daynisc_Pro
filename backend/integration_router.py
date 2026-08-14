"""
Integration Router
Handles WhatsApp webhook integrations and Email import simulation/polling.
"""
from __future__ import annotations
import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser
from tasks import process_document_task
from config import settings

router = APIRouter()

# ── WhatsApp Webhook Integration ──────────────────────────────────────────────

@router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """Verify webhook connection for Meta/WhatsApp Business API."""
    expected_token = settings.WHATSAPP_TOKEN or "daynisc-verify-token"
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        print("[DEBUG Integration] WhatsApp webhook verified successfully.")
        return int(hub_challenge)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid verification token"
    )

@router.post("/whatsapp/webhook")
async def receive_whatsapp_message(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive incoming message from WhatsApp Business API.
    If it's an image/document invoice, store it and queue Celery AI extraction.
    """
    body = await request.json()
    print(f"[DEBUG Integration] WhatsApp Webhook payload received: {body}")
    
    # Extract entries
    entry = body.get("entry", [])
    if not entry:
        return {"status": "empty_entry"}
        
    changes = entry[0].get("changes", [])
    if not changes:
        return {"status": "empty_changes"}
        
    value = changes[0].get("value", {})
    messages = value.get("messages", [])
    if not messages:
        return {"status": "no_messages"}
        
    message = messages[0]
    phone = message.get("from")
    msg_type = message.get("type")
    
    # Check for document or image
    media_id = None
    mime_type = None
    filename = "whatsapp_received"
    
    if msg_type == "document":
        doc = message.get("document", {})
        media_id = doc.get("id")
        mime_type = doc.get("mime_type")
        filename = doc.get("filename", "whatsapp_doc.pdf")
    elif msg_type == "image":
        img = message.get("image", {})
        media_id = img.get("id")
        mime_type = img.get("mime_type")
        filename = "whatsapp_image.jpg"
        
    if media_id:
        print(f"[DEBUG Integration] Received media message from {phone}. Media ID: {media_id}")
        
        # In a real Meta setup:
        # 1. Fetch media URL using media_id (GET /v1/media/<ID> with WhatsApp token)
        # 2. Download media bytes from Meta servers
        # 3. Store in S3 and save to public.document_extractions
        
        # We will simulate: Find the company that owns the WhatsApp webhook by token or configurations
        # For simplicity, map to the default tenant schema for the active user's company (we search public.companies)
        company_res = await db.execute(text("""
            SELECT id, db_schema FROM public.companies WHERE is_active = True LIMIT 1
        """))
        co = company_res.fetchone()
        if co:
            co_id = str(co.id)
            schema = co.db_schema
            
            # Create a mock database extraction record
            doc_id = str(uuid.uuid4())
            s3_key = f"whatsapp/{doc_id}_{filename}"
            
            await db.execute(text(f"""
                INSERT INTO {schema}.document_extractions (
                    id, s3_key, filename, document_type, status, created_at, updated_at
                ) VALUES (
                    :id, :s3, :fn, 'whatsapp_img', 'pending', NOW(), NOW()
                )
            """), {"id": doc_id, "s3": s3_key, "fn": filename})
            await db.commit()
            
            # Trigger Celery task
            process_document_task.delay(
                extraction_id=doc_id,
                s3_key=s3_key,
                mime_type=mime_type or "image/jpeg",
                document_type="whatsapp_img",
                language="auto",
                company_id=co_id,
                schema=schema
            )
            return {"status": "queued", "extraction_id": doc_id}
            
    return {"status": "ignored", "reason": "No supported media type found"}


# ── Email Import Poller Simulation ───────────────────────────────────────────

@router.post("/email/poll")
async def poll_email_invoices(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Simulate scanning Gmail/Outlook inbox for attachments.
    Matches emails with subject 'invoice', 'bill', or 'receipt'.
    Creates extraction records and queues AI extraction tasks.
    """
    # Simulate finding 2 attachments in the inbox
    simulated_invoices = [
        {"filename": "vendor_invoice_1092.pdf", "type": "purchase"},
        {"filename": "electricity_bill_june.png", "type": "expense"},
    ]
    
    queued = []
    await db.execute(text(f"SET search_path TO {user.db_schema}, public"))
    
    for invoice in simulated_invoices:
        doc_id = str(uuid.uuid4())
        s3_key = f"email/{doc_id}_{invoice['filename']}"
        
        await db.execute(text("""
            INSERT INTO document_extractions (
                id, s3_key, filename, document_type, status, created_at, updated_at
            ) VALUES (
                :id, :s3, :fn, CAST(:dtype AS doc_type_enum), 'pending', NOW(), NOW()
            )
        """), {
            "id": doc_id,
            "s3": s3_key,
            "fn": invoice["filename"],
            "dtype": "purchase_bill" if invoice["type"] == "purchase" else "other"
        })
        
        # Trigger Celery background parsing
        process_document_task.delay(
            extraction_id=doc_id,
            s3_key=s3_key,
            mime_type="application/pdf" if invoice["filename"].endswith(".pdf") else "image/png",
            document_type=invoice["type"],
            language="auto",
            company_id=str(user.company_id),
            schema=user.db_schema
        )
        queued.append({"id": doc_id, "filename": invoice["filename"]})
        
    await db.commit()
    return {
        "success": True,
        "message": f"Successfully simulated email scan. Queued {len(queued)} invoices from inbox.",
        "items": queued
    }
