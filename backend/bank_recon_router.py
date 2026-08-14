"""
Bank Reconciliation Router
Matches bank statement transactions against accounting vouchers in the ledger.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from typing import Any, List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser

router = APIRouter()

# ── Models ────────────────────────────────────────────────────────────────────

class BankTransactionItem(BaseModel):
    id: Optional[str] = None
    date: str  # YYYY-MM-DD
    description: str
    reference_number: Optional[str] = None
    withdrawal: float = 0.0  # Debit
    deposit: float = 0.0     # Credit
    balance: float = 0.0

class ReconciliationPayload(BaseModel):
    extraction_id: str
    transactions: List[BankTransactionItem]

class CreateReconciledVoucherPayload(BaseModel):
    date: str
    party_name: str
    amount: float
    is_withdrawal: bool  # True -> payment voucher, False -> receipt voucher
    reference_number: Optional[str] = None
    narration: Optional[str] = None

# ── Helper: parse date safely ──────────────────────────────────────────────────
def _parse_date(d_str: str) -> datetime.date:
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(d_str[:10], fmt).date()
        except ValueError:
            continue
    return datetime.now().date()

# ── Reconciliation Matching Algorithm ──────────────────────────────────────────

@router.post("/reconcile")
async def reconcile_transactions(
    payload: ReconciliationPayload,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Given a list of transactions from an uploaded bank statement,
    find matches/partial matches in the accounting_vouchers database table.
    """
    await db.execute(text(f"SET search_path TO {user.db_schema}, public"))
    
    # 1. Fetch all sales, purchase, payment, and receipt vouchers (last 60 days)
    # to run match comparisons
    vouchers_res = await db.execute(text("""
        SELECT av.id, av.voucher_number, av.voucher_type::text, av.voucher_date::text,
               av.total, av.reference_number, p.name as party_name
        FROM accounting_vouchers av
        LEFT JOIN parties p ON p.id = av.party_id
        WHERE av.voucher_type IN ('payment', 'receipt', 'purchase', 'sales')
          AND NOT av.is_cancelled
          AND av.voucher_date >= CURRENT_DATE - INTERVAL '90 days'
    """))
    vouchers = [dict(v._mapping) for v in vouchers_res.fetchall()]
    
    results = []
    
    for tx in payload.transactions:
        tx_date = _parse_date(tx.date)
        is_debit = tx.withdrawal > 0
        tx_amt = tx.withdrawal if is_debit else tx.deposit
        
        # Determine expected voucher type (withdrawal -> payment/purchase, deposit -> receipt/sales)
        expected_types = ['payment', 'purchase'] if is_debit else ['receipt', 'sales']
        
        best_match = None
        match_type = "unmatched"  # unmatched | partial | exact
        highest_score = 0
        
        # Run matching checks against each voucher
        for v in vouchers:
            v_date = _parse_date(v["voucher_date"])
            v_amt = float(v["total"] or 0)
            v_type = v["voucher_type"]
            
            # Skip if not corresponding type
            if v_type not in expected_types:
                continue
                
            score = 0
            
            # 1. Check Amount (Crucial)
            if abs(v_amt - tx_amt) < 0.01:
                score += 50
                
            # 2. Check Date proximity
            day_diff = abs((v_date - tx_date).days)
            if day_diff == 0:
                score += 30
            elif day_diff <= 3:
                score += 15
            elif day_diff <= 10:
                score += 5
                
            # 3. Check Reference / Cheque / UTR matches
            if tx.reference_number and v["reference_number"]:
                tx_ref_clean = "".join(e for e in str(tx.reference_number) if e.isalnum()).lower()
                v_ref_clean = "".join(e for e in str(v["reference_number"]) if e.isalnum()).lower()
                if tx_ref_clean in v_ref_clean or v_ref_clean in tx_ref_clean:
                    score += 40
            
            # 4. Fuzzy description / party match
            if v["party_name"]:
                party_clean = v["party_name"].lower()
                desc_clean = tx.description.lower()
                if party_clean in desc_clean or any(word in desc_clean for word in party_clean.split()):
                    score += 10
            
            # Evaluate match quality
            if score > highest_score:
                highest_score = score
                best_match = v
                
        # Classify match quality based on score
        if highest_score >= 80:
            match_type = "exact"
        elif highest_score >= 40:
            match_type = "partial"
        else:
            match_type = "unmatched"
            
        results.append({
            "transaction": {
                "id": tx.id or str(uuid.uuid4()),
                "date": str(tx_date),
                "description": tx.description,
                "reference_number": tx.reference_number,
                "withdrawal": tx.withdrawal,
                "deposit": tx.deposit,
                "balance": tx.balance,
            },
            "match_status": match_type,
            "matched_voucher": best_match
        })
        
    return {"results": results, "count": len(results)}


# ── Create Voucher directly from Recon Panel ─────────────────────────────────

@router.post("/auto-create-voucher")
async def auto_create_reconciled_voucher(
    payload: CreateReconciledVoucherPayload,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Creates a new Payment or Receipt voucher directly from the reconciliation table
    for an unmatched transaction.
    """
    await db.execute(text(f"SET search_path TO {user.db_schema}, public"))
    
    vtype = "payment" if payload.is_withdrawal else "receipt"
    prefix = "PAY" if payload.is_withdrawal else "REC"
    
    # 1. Resolve Party Name (find or create)
    party_res = await db.execute(text("""
        SELECT id FROM parties WHERE LOWER(name) = LOWER(:name) LIMIT 1
    """), {"name": payload.party_name.strip()})
    p_row = party_res.fetchone()
    
    if p_row:
        party_id = str(p_row[0])
    else:
        party_id = str(uuid.uuid4())
        await db.execute(text("""
            INSERT INTO parties (id, name, party_type, created_at, updated_at)
            VALUES (:id, :name, :ptype, NOW(), NOW())
        """), {
            "id": party_id,
            "name": payload.party_name.strip(),
            "ptype": "supplier" if payload.is_withdrawal else "customer"
        })
        
    # 2. Next Voucher Number
    v_date = _parse_date(payload.date)
    fy = v_date.year
    num_res = await db.execute(text("SELECT next_voucher_number(:prefix, :fy)"), {"prefix": prefix, "fy": fy})
    voucher_number = num_res.scalar()
    
    # 3. Insert voucher
    voucher_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO accounting_vouchers (
            id, voucher_number, voucher_type, voucher_date,
            party_id, reference_number, line_items,
            subtotal, total_cgst, total_sgst, total_igst, total,
            narration, tally_synced, is_cancelled, created_by, created_at, updated_at
        ) VALUES (
            :id, :vnum, CAST(:vtype AS voucher_type_enum), :vdate,
            :party_id, :ref, '[]'::jsonb,
            :subtotal, 0, 0, 0, :total,
            :narration, false, false, :user_id, NOW(), NOW()
        )
    """), {
        "id": voucher_id,
        "vnum": voucher_number,
        "vtype": vtype,
        "vdate": v_date,
        "party_id": uuid.UUID(party_id),
        "ref": payload.reference_number,
        "subtotal": payload.amount,
        "total": payload.amount,
        "narration": payload.narration or f"Bank Recon Auto Voucher — {payload.party_name}",
        "user_id": uuid.UUID(str(user.id)) if user.id else None
    })
    
    await db.commit()
    return {
        "success": True,
        "voucher_id": voucher_id,
        "voucher_number": voucher_number,
        "message": f"Successfully created {vtype} voucher {voucher_number}."
    }
