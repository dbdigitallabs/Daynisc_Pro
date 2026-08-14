import os
import sys
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
print(f"Connecting to database at: {SYNC_URL[:60]}...")

try:
    engine = create_engine(SYNC_URL, connect_args={"sslmode": "require"} if "supabase" in SYNC_URL else {})
    with engine.connect() as conn:
        # Alter public.doc_type_enum to add 'bank_statement'
        print("Altering public.doc_type_enum type to add 'bank_statement'...")
        # Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
        # SQLAlchemy's execution model might wrap it in transaction by default unless we set isolation level or autocommit.
        # So we run with execution options autocommit=True or execute on connection raw.
        conn.execution_options(isolation_level="AUTOCOMMIT").execute(text("""
            ALTER TYPE public.doc_type_enum ADD VALUE IF NOT EXISTS 'bank_statement';
        """))
        print("[OK] Altered doc_type_enum type successfully.")
except Exception as e:
    print(f"[ERROR] Failed to alter type: {e}")
