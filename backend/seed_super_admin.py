import os
import sys
import uuid
from sqlalchemy import create_engine, text

# Load env
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
    print("ERROR: DATABASE_URL not found in .env")
    sys.exit(1)

SYNC_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
print(f"Connecting to database...")

def seed():
    try:
        engine = create_engine(SYNC_URL, connect_args={"sslmode": "require"} if "supabase" in SYNC_URL else {})
        with engine.connect() as conn:
            # 1. Check and get root company
            res = conn.execute(text("SELECT id FROM public.companies LIMIT 1"))
            company_row = res.fetchone()
            
            if company_row:
                company_id = company_row[0]
            else:
                company_id = uuid.uuid4()
                print(f"Creating default company Daynisc...")
                conn.execute(text("""
                    INSERT INTO public.companies (id, name, db_schema, plan, is_active)
                    VALUES (:id, 'Daynisc Pvt Ltd', 'co_daynisc', 'enterprise', true);
                """), {"id": company_id})
                conn.commit()

            # 2. Seed/Upgrade 9999999999
            res_99 = conn.execute(text("SELECT id FROM public.users WHERE phone = '9999999999'"))
            row_99 = res_99.fetchone()
            if row_99:
                conn.execute(text("""
                    UPDATE public.users 
                    SET role = 'super_admin', company_id = :company_id, is_active = true 
                    WHERE phone = '9999999999';
                """), {"company_id": company_id})
                print("[OK] Upgraded 9999999999 to super_admin.")
            else:
                conn.execute(text("""
                    INSERT INTO public.users (id, phone, name, email, company_id, role, is_active)
                    VALUES (:id, '9999999999', 'Bhavesh Khimsuriya', 'bhavesh@daynisc.com', :company_id, 'super_admin', true);
                """), {"id": uuid.uuid4(), "company_id": company_id})
                print("[OK] Created and seeded 9999999999 as super_admin.")
            
            # 3. Seed/Upgrade 9898551319
            res_98 = conn.execute(text("SELECT id FROM public.users WHERE phone = '9898551319'"))
            row_98 = res_98.fetchone()
            if row_98:
                conn.execute(text("""
                    UPDATE public.users 
                    SET role = 'super_admin', company_id = :company_id, is_active = true 
                    WHERE phone = '9898551319';
                """), {"company_id": company_id})
                print("[OK] Upgraded 9898551319 to super_admin.")
            else:
                conn.execute(text("""
                    INSERT INTO public.users (id, phone, name, email, company_id, role, is_active)
                    VALUES (:id, '9898551319', 'Owner / Super Admin', 'owner@daynisc.com', :company_id, 'super_admin', true);
                """), {"id": uuid.uuid4(), "company_id": company_id})
                print("[OK] Created and seeded 9898551319 as super_admin.")
                
            conn.commit()
            print("[SUCCESS] Both super admin numbers seeded in Supabase database!")
            
    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed()
