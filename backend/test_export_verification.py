import os
import sys
import asyncio
import uuid
import json
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

# Load .env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

DATABASE_URL = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found!")
    sys.exit(1)

# Ensure database engine uses asyncpg
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Helper to format/parse dates
def _parse_date(val):
    from datetime import datetime
    if not val:
        return date.today()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(val)[:10], fmt).date()
        except Exception:
            continue
    return date.today()

async def test_flow():
    engine = create_async_engine(DATABASE_URL)
    
    # Generate unique test IDs
    doc_id = uuid.uuid4()
    company_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    created_company = False
    created_user = False
    
    async with AsyncSession(engine) as db:
        # Get or create a valid company and user to associate with
        company_res = await db.execute(text("SELECT id FROM public.companies LIMIT 1"))
        company_row = company_res.fetchone()
        if company_row:
            company_id = company_row[0]
            print(f"Using existing company_id: {company_id}")
        else:
            print(f"Creating temporary company: {company_id}")
            await db.execute(text("""
                INSERT INTO public.companies (id, name, db_schema, plan, is_active, created_at, updated_at)
                VALUES (:id, 'Test Company', 'public', 'Enterprise', true, NOW(), NOW())
            """), {"id": company_id})
            created_company = True
            
        user_res = await db.execute(text("SELECT id FROM public.users LIMIT 1"))
        user_row = user_res.fetchone()
        if user_row:
            user_id = user_row[0]
            print(f"Using existing user_id: {user_id}")
        else:
            print(f"Creating temporary user: {user_id}")
            await db.execute(text("""
                INSERT INTO public.users (id, phone, name, email, company_id, role, is_active, created_at)
                VALUES (:id, '+919999999999', 'Test User', 'test@test.com', :company_id, 'owner', true, NOW())
            """), {"id": user_id, "company_id": company_id})
            created_user = True
            
        # 1. Insert mock export invoice extraction record
        mock_data = {
            "document_type": "export_invoice",
            "invoice_number": "EXP-2026-001",
            "invoice_date": "2026-06-02",
            "consignee_name": "Test Global Consignee Ltd",
            "incoterms": "CIF HAMBURG",
            "currency": "USD",
            "advance_licence_no": "ADV-987654",
            "total_amount": 45000.0,
            "line_items": [
                {
                    "item_name": "Industrial Valve model A",
                    "quantity": 100,
                    "unit": "PCS",
                    "rate": 450.0,
                    "total": 45000.0
                }
            ]
        }
        
        print("Inserting mock document extraction...")
        await db.execute(text("""
            INSERT INTO public.document_extractions (
                id, s3_key, filename, document_type, status,
                confidence_score, language, extracted_data,
                is_duplicate, uploaded_by, created_at, updated_at
            ) VALUES (
                :id, 'local/test_export.pdf', 'test_export.pdf',
                CAST('invoice' AS doc_type_enum),
                CAST('pending' AS extraction_status_enum),
                0.95, 'en', CAST(:data AS jsonb),
                false, :uploaded_by, NOW(), NOW()
            )
        """), {
            "id": doc_id,
            "data": json.dumps(mock_data),
            "uploaded_by": user_id
        })
        await db.commit()
        
        # 2. Simulate documents_router verification logic
        print("Running router verification logic simulation...")
        
        # Load from DB to simulate router's select
        res = await db.execute(text("""
            SELECT extracted_data, document_type::text
            FROM public.document_extractions WHERE id = :id
        """), {"id": doc_id})
        row = res.fetchone()
        
        raw_data = row[0]
        doc_type_raw = row[1]
        
        data = raw_data if isinstance(raw_data, dict) else json.loads(raw_data)
        
        # Run DB updates and inserts
        voucher_id = uuid.uuid4()
        
        # Map doc type to voucher type
        vtype_map = {
            "invoice": "sales", "purchase_bill": "purchase",
            "purchase": "purchase", "sales": "sales",
            "export_invoice": "sales", "export": "sales",
            "payment_screenshot": "payment", "other": "journal",
            "lr": "journal", "challan": "journal",
        }
        vtype = vtype_map.get(data.get("document_type") or doc_type_raw, "purchase")
        
        # Part 1: find or create the party
        party_name = (
            data.get("consignee_name")
            or data.get("party_name")
            or data.get("transporter_name")
            or data.get("bank_reference")
            or "Unknown Party"
        ) if vtype == "sales" else (
            data.get("party_name")
            or data.get("transporter_name")
            or data.get("bank_reference")
            or "Unknown Party"
        )
        party_type = "supplier" if vtype == "purchase" else "customer"
        
        # Query/Insert party
        p_res = await db.execute(text("""
            SELECT id FROM public.parties WHERE LOWER(name) = LOWER(:name) LIMIT 1
        """), {"name": party_name})
        p_row = p_res.fetchone()
        
        if p_row:
            party_id = p_row[0]
            print(f"Found existing party: {party_name} -> {party_id}")
        else:
            party_id = uuid.uuid4()
            print(f"Creating new customer party: {party_name} -> {party_id}")
            await db.execute(text("""
                INSERT INTO public.parties (id, name, party_type, created_at, updated_at)
                VALUES (:id, :name, :ptype, NOW(), NOW())
            """), {
                "id": party_id,
                "name": party_name,
                "ptype": party_type
            })
            
        # Part 2: insert voucher with narration
        doc_type_raw_val = data.get("document_type") or doc_type_raw
        _narration_parts = [f"AI-extracted from {doc_type_raw_val} — {party_name}"]
        if data.get("consignee_name") and doc_type_raw_val in ("export_invoice", "invoice"):
            _narration_parts.append(f"Consignee: {data['consignee_name']}")
        if data.get("incoterms"):
            _narration_parts.append(f"INCOTERMS: {data['incoterms']}")
        if data.get("currency") and data.get("currency") != "INR":
            _narration_parts.append(f"Currency: {data['currency']}")
        if data.get("advance_licence_no"):
            _narration_parts.append(f"Adv. Licence: {data['advance_licence_no']}")
        _narration = " | ".join(_narration_parts)
        
        voucher_num = data.get("invoice_number") or f"SAL-AI-{doc_id.hex[:6].upper()}"
        vdate = _parse_date(data.get("invoice_date"))
        
        print(f"Inserting voucher with narration: '{_narration}'")
        await db.execute(text("""
            INSERT INTO public.accounting_vouchers (
                id, voucher_number, voucher_type, voucher_date,
                party_id, line_items, subtotal, total_cgst, total_sgst,
                total_igst, total, narration, tally_synced, is_cancelled,
                source_extraction, created_by, created_at, updated_at
            ) VALUES (
                :id, :vnum, CAST(:vt AS voucher_type_enum), :vdate,
                :pid, :li,
                :subtotal, :cgst, :sgst, :igst, :total,
                :narr, false, false,
                :src, :created_by, NOW(), NOW()
            )
        """), {
            "id": voucher_id,
            "vnum": voucher_num,
            "vt": vtype,
            "vdate": vdate,
            "pid": party_id,
            "li": json.dumps(data.get("line_items", [])),
            "subtotal": float(data.get("subtotal") or 0),
            "cgst": float(data.get("total_cgst") or 0),
            "sgst": float(data.get("total_sgst") or 0),
            "igst": float(data.get("total_igst") or 0),
            "total": float(data.get("total_amount") or 0),
            "narr": _narration,
            "src": doc_id,
            "created_by": user_id
        })
        
        # Update extraction status
        await db.execute(text("""
            UPDATE public.document_extractions
            SET status = 'pushed', updated_at = NOW(), verified_by = :user_id, verified_at = NOW()
            WHERE id = :id
        """), {"id": doc_id, "user_id": user_id})
        
        await db.commit()
        print("Voucher verification flow complete. Running assertions...")
        
        # 3. Assertions
        # Check voucher
        v_res = await db.execute(text("SELECT voucher_type::text, narration, party_id FROM public.accounting_vouchers WHERE id = :id"), {"id": voucher_id})
        v_row = v_res.fetchone()
        assert v_row is not None, "Voucher was not created"
        assert v_row[0] == "sales", f"Voucher type should be sales, got: {v_row[0]}"
        assert "Consignee: Test Global Consignee Ltd" in v_row[1], f"Consignee missing from narration: {v_row[1]}"
        assert "INCOTERMS: CIF HAMBURG" in v_row[1], f"INCOTERMS missing from narration: {v_row[1]}"
        assert "Currency: USD" in v_row[1], f"Currency missing from narration: {v_row[1]}"
        assert "Adv. Licence: ADV-987654" in v_row[1], f"Licence missing from narration: {v_row[1]}"
        assert str(v_row[2]) == str(party_id), f"Party ID mismatch on voucher"
        
        # Check party type
        p_check = await db.execute(text("SELECT party_type::text FROM public.parties WHERE id = :id"), {"id": party_id})
        p_check_row = p_check.fetchone()
        assert p_check_row[0] == "customer", f"Party type should be customer, got: {p_check_row[0]}"
        
        print("\n[PASS] All verification assertions passed successfully!")
        
        # 4. Clean up
        print("Cleaning up database test records...")
        await db.execute(text("DELETE FROM public.accounting_vouchers WHERE id = :id"), {"id": voucher_id})
        await db.execute(text("DELETE FROM public.document_extractions WHERE id = :id"), {"id": doc_id})
        # Only delete party if we created it in this test
        if not p_row:
            await db.execute(text("DELETE FROM public.parties WHERE id = :id"), {"id": party_id})
            
        if created_user:
            await db.execute(text("DELETE FROM public.users WHERE id = :id"), {"id": user_id})
        if created_company:
            await db.execute(text("DELETE FROM public.companies WHERE id = :id"), {"id": company_id})
            
        await db.commit()
        print("Cleanup complete!")

if __name__ == "__main__":
    asyncio.run(test_flow())
