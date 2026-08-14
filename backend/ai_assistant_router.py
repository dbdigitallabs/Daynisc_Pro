"""
AI Assistant Router
Translates natural language questions to SQL, executes them under tenant context,
and summarizes the query results using Gemini.
"""
from __future__ import annotations
import re
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from google import genai
from google.genai import types

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser
from config import settings

router = APIRouter()

class QueryPayload(BaseModel):
    query: str

def _get_client():
    key = settings.GEMINI_API_KEY
    if not key or key in ("your-gemini-key", "change-me", "None"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please set it in Settings."
        )
    return genai.Client(api_key=key)

# ── Database Schema Context for Gemini ────────────────────────────────────────
_SCHEMA_EXPLANATION = """
You are an expert SQL translation agent for a PostgreSQL database.
Translate the user's natural language business/accounting question into a single, valid PostgreSQL SELECT query.
DO NOT use schema prefixes (e.g. do not write 'schema.table_name', just use 'table_name'). The query will run with a search path set to the tenant's schema.
DO NOT generate any write operations (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE). Generate ONLY SELECT.

Here are the tables:
1. parties
   - id (UUID, PK)
   - party_code (VARCHAR)
   - party_type (VARCHAR) -- 'customer', 'supplier', 'both', 'transporter'
   - name (VARCHAR) -- Party name
   - gstin (VARCHAR) -- GST number
   - balance (NUMERIC) -- Current outstanding balance
   - state (VARCHAR), city (VARCHAR), phone (VARCHAR)

2. accounting_vouchers
   - id (UUID, PK)
   - voucher_number (VARCHAR)
   - voucher_type (voucher_type_enum) -- 'purchase', 'sales', 'payment', 'receipt', 'journal', 'debit_note', 'credit_note'
   - voucher_date (DATE)
   - party_id (UUID, FK to parties)
   - reference_number (VARCHAR)
   - line_items (JSONB) -- e.g. [{"item_name": "...", "qty": 10, "rate": 500, "total": 5000}]
   - subtotal (NUMERIC), total_cgst (NUMERIC), total_sgst (NUMERIC), total_igst (NUMERIC), total (NUMERIC)
   - narration (TEXT)
   - tally_synced (BOOLEAN)
   - is_cancelled (BOOLEAN)

3. item_master
   - id (UUID, PK)
   - item_code (VARCHAR), item_name (VARCHAR)
   - item_group (VARCHAR)
   - gst_rate (NUMERIC) -- e.g. 18.0
   - unit (VARCHAR)
   - mrp (NUMERIC)
   - tally_item (VARCHAR) -- Tally sync item name

4. stock_ledger & stock_balance
   - stock_balance has columns: item_id (UUID), warehouse_id (UUID), quantity (NUMERIC), total_value (NUMERIC)
   - stock_ledger tracks movements: item_id, warehouse_id, movement_type ('inward', 'outward', etc.), quantity, balance_qty, unit_cost, total_value, movement_date

5. outstanding_summary (VIEW)
   - party_id (UUID), party_name (VARCHAR), party_type (VARCHAR)
   - phone (VARCHAR), invoice_count (INT)
   - receivable (NUMERIC) -- Money owed to us (customers)
   - payable (NUMERIC) -- Money we owe (suppliers)
   - last_transaction (DATE)

6. production_orders
   - id, order_number, planned_qty, actual_qty, status ('planned', 'in_progress', 'completed'), planned_date

7. sales_orders
   - id, order_number, customer_id, status ('draft', 'confirmed', 'delivered'), order_date, total

8. transport_lr
   - id, lr_number, lr_date, transporter_id, vehicle_number, origin, destination, freight_amount, status

Query construction hints:
- Filter out cancelled vouchers using: NOT is_cancelled
- To check outstanding receivables from customers: SELECT party_name, receivable FROM outstanding_summary WHERE receivable > 0
- To find sales for today: SELECT SUM(total) FROM accounting_vouchers WHERE voucher_type = 'sales' AND voucher_date = CURRENT_DATE AND NOT is_cancelled
- To find top selling items, you might need to scan accounting_vouchers and unnest/parse line_items JSONB if needed, or query stock_ledger.

Format response as plain text SQL only. Wrap the SQL query inside ```sql ... ``` block.
"""

def _is_safe_sql(sql: str) -> bool:
    """Analyze SQL to ensure it is strictly a read-only SELECT query."""
    clean_sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL) # remove comments
    clean_sql = re.sub(r'--.*$', '', clean_sql, flags=re.MULTILINE)
    
    # Check for forbidden keywords (case-insensitive words)
    forbidden = r'\b(update|delete|insert|drop|alter|truncate|create|grant|revoke|replace|reindex|vacuum|analyze)\b'
    if re.search(forbidden, clean_sql, re.IGNORECASE):
        return False
    
    # Must contain SELECT
    if not re.search(r'\bselect\b', clean_sql, re.IGNORECASE):
        return False
        
    return True

@router.post("/query")
async def chat_with_data(
    payload: QueryPayload,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Accepts natural language, uses Gemini to generate SQL,
    runs the query on the database, and summarizes results with Gemini.
    """
    client = _get_client()
    user_query = payload.query.strip()
    
    # ── Phase 1: Generate SQL ──
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_text(text=_SCHEMA_EXPLANATION),
                types.Part.from_text(text=f"User Question: {user_query}")
            ]
        )
        model_output = response.text or ""
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate SQL from query: {e}"
        )
        
    # Extract SQL block
    sql_match = re.search(r'```sql\s*(.*?)\s*```', model_output, re.DOTALL | re.IGNORECASE)
    sql_query = sql_match.group(1) if sql_match else model_output.strip()
    
    # Clean it up (strip trailing semicolons or markdown indicators)
    sql_query = sql_query.replace("```", "").strip()
    
    if not _is_safe_sql(sql_query):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The AI generated a potentially unsafe or non-SELECT query: {sql_query}"
        )
        
    # ── Phase 2: Execute SQL under tenant schema ──
    try:
        # Set tenant schema search path
        await db.execute(text(f"SET search_path TO {user.db_schema}, public"))
        
        # Execute query
        db_res = await db.execute(text(sql_query))
        rows = [dict(r._mapping) for r in db_res.fetchall()]
    except Exception as e:
        await db.rollback()
        # Fall back or return the error detail so the user knows
        return {
            "query": user_query,
            "sql": sql_query,
            "error": f"Database execution failed: {str(e)}",
            "answer": "Sorry, I generated an invalid database query. Let me try to help you otherwise or you can rephrase your question."
        }
        
    # ── Phase 3: Summarize Results ──
    summary_prompt = f"""
You are an intelligent accounting dashboard assistant named Daynisc AI.
The user asked: "{user_query}"
To answer this, we executed this SQL query:
{sql_query}

The query returned the following rows (as JSON):
{rows}

Provide a polite, professional, concise summary of the data in English.
Format currency in Indian Rupees (e.g. ₹1,50,000). Use bullet points where appropriate to make it readable.
If no data was returned, let the user know clearly and politely.
Do not mention SQL, tables, or database names in the final answer. Keep it user-focused.
"""
    try:
        summary_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Part.from_text(text=summary_prompt)]
        )
        answer = summary_response.text or "I parsed the data but couldn't formulate a summary response."
    except Exception as e:
        answer = f"I retrieved the data successfully: {rows}. (Summary generation failed: {e})"
        
    return {
        "query": user_query,
        "sql": sql_query,
        "results": rows[:50], # Cap returned results in response
        "answer": answer.strip()
    }
