"""Quick test: try to approve doc 8ed7bd4d-dc84-4eb9-b675-8751cfbaddf8"""
import asyncio, json, uuid
from datetime import date, datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from shared.config import settings

DOC_ID = "8ed7bd4d-dc84-4eb9-b675-8751cfbaddf8"

def _parse_date(val):
    if not val:
        return date.today()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(val)[:10], fmt).date()
        except Exception:
            continue
    return date.today()

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as db:
        # 1. Get extraction data
        r = await db.execute(
            text("SELECT extracted_data, document_type::text FROM document_extractions WHERE id=:id"),
            {"id": DOC_ID}
        )
        row = r.fetchone()
        if not row:
            print("ERROR: doc not found"); return
        data = row[0] if isinstance(row[0], dict) else {}
        print(f"Party: {data.get('party_name')}, Total: {data.get('total_amount')}, Items: {len(data.get('line_items',[]))}")

        party_name = data.get("party_name") or "Unknown"

        # 2. Find/create party
        try:
            res = await db.execute(text("SELECT id FROM parties WHERE LOWER(name)=LOWER(:n) LIMIT 1"), {"n": party_name})
            prow = res.fetchone()
            if prow:
                party_id = uuid.UUID(str(prow[0]))
                print(f"Found party: {party_id}")
            else:
                party_id = uuid.uuid4()
                await db.execute(
                    text("INSERT INTO parties (id, name, party_type, created_at, updated_at) VALUES (:id, :n, 'supplier', NOW(), NOW())"),
                    {"id": party_id, "n": party_name}
                )
                print(f"Created party: {party_id}")
        except Exception as e:
            print(f"PARTY ERROR: {e}"); await db.rollback(); return

        # 3. Insert voucher with proper Python types
        try:
            voucher_id = uuid.uuid4()
            line_items_json = json.dumps([
                {"item_name": i.get("item_name","Item"), "qty": float(i.get("quantity") or 1),
                 "unit": i.get("unit","PCS"), "rate": float(i.get("rate") or 0), "total": float(i.get("total") or 0)}
                for i in data.get("line_items", [])
            ])
            voucher_num = data.get("invoice_number") or f"PUR-AI-{DOC_ID[:6].upper()}"
            vdate = _parse_date(data.get("invoice_date"))  # real date object!

            print(f"Inserting voucher: num={voucher_num}, date={vdate} ({type(vdate).__name__}), party={party_id}")

            await db.execute(text("""
                INSERT INTO accounting_vouchers (
                    id, voucher_number, voucher_type, voucher_date,
                    party_id, line_items, subtotal, total_cgst, total_sgst,
                    total_igst, total, narration, tally_synced, is_cancelled,
                    source_extraction, created_at, updated_at
                ) VALUES (
                    :id, :vnum, CAST(:vt AS voucher_type_enum), :vdate,
                    :pid, CAST(:li AS jsonb),
                    :subtotal, :cgst, :sgst, :igst, :total,
                    :narr, false, false,
                    :src, NOW(), NOW()
                )
            """), {
                "id": voucher_id,          # uuid.UUID
                "vnum": voucher_num,
                "vt": "purchase",
                "vdate": vdate,            # datetime.date object
                "pid": party_id,           # uuid.UUID
                "li": line_items_json,
                "subtotal": float(data.get("subtotal") or 0),
                "cgst": float(data.get("total_cgst") or 0),
                "sgst": float(data.get("total_sgst") or 0),
                "igst": float(data.get("total_igst") or 0),
                "total": float(data.get("total_amount") or 0),
                "narr": f"AI extracted — {party_name}",
                "src": uuid.UUID(DOC_ID),  # uuid.UUID
            })
            await db.commit()
            print(f"SUCCESS: voucher {voucher_id} created!")
        except Exception as e:
            await db.rollback()
            print(f"VOUCHER ERROR: {e}")

asyncio.run(main())
