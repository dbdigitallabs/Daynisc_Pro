import os
import sys
import uuid
from sqlalchemy import create_engine, text

# Load .env from parent directory
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
    print("ERROR: DATABASE_URL not found in .env file!")
    sys.exit(1)

SYNC_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
print(f"Connecting to Supabase at: {SYNC_URL[:60]}...")

def migrate():
    try:
        engine = create_engine(SYNC_URL, connect_args={"sslmode": "require"} if "supabase" in SYNC_URL else {})
        with engine.connect() as conn:
            # 1. Add parent_id column
            print("Adding parent_id column to public.companies table...")
            conn.execute(text("""
                ALTER TABLE public.companies 
                ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.companies(id);
            """))
            conn.commit()
            print("[OK] parent_id column successfully verified/added.")

            # 2. Check and Insert root company
            res = conn.execute(text("SELECT id FROM public.companies LIMIT 1"))
            company_row = res.fetchone()
            
            if company_row:
                company_id = company_row[0]
                print(f"Found existing company with ID: {company_id}")
            else:
                company_id = uuid.uuid4()
                print(f"No companies found. Creating default root company 'Daynisc Pvt Ltd' with ID: {company_id}...")
                conn.execute(text("""
                    INSERT INTO public.companies (id, name, legal_name, db_schema, plan, is_active)
                    VALUES (:id, 'Daynisc Pvt Ltd', 'Daynisc Private Limited', 'co_daynisc', 'enterprise', true);
                """), {"id": company_id})
                conn.commit()
                print("[OK] Default company created.")

            # 3. Check and Insert/Update super admin user 9999999999
            res = conn.execute(text("SELECT id FROM public.users WHERE phone = '9999999999'"))
            user_row = res.fetchone()

            if user_row:
                user_id = user_row[0]
                print(f"User 9999999999 exists (ID: {user_id}). Upgrading role to super_admin...")
                conn.execute(text("""
                    UPDATE public.users 
                    SET role = 'super_admin', company_id = :company_id, is_active = true 
                    WHERE phone = '9999999999';
                """), {"company_id": company_id})
                conn.commit()
                print("[OK] User role upgraded to super_admin.")
            else:
                user_id = uuid.uuid4()
                print(f"Creating super_admin user 'Bhavesh Khimsuriya' (9999999999) with ID: {user_id}...")
                conn.execute(text("""
                    INSERT INTO public.users (id, phone, name, email, company_id, role, is_active)
                    VALUES (:id, '9999999999', 'Bhavesh Khimsuriya', 'bhavesh@daynisc.com', :company_id, 'super_admin', true);
                """), {"id": user_id, "company_id": company_id})
                conn.commit()
                print("[OK] Super Admin user registered.")

            print("\n[SUCCESS] Supabase migration and seed completed successfully!")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
