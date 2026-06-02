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

# Get DATABASE_URL and convert asyncpg driver to psycopg2 for sync testing
DATABASE_URL = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env file!")
    sys.exit(1)

# Convert asyncpg URL to psycopg2-compatible URL for sync testing
SYNC_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
print(f"Testing connection to: {SYNC_URL[:60]}...")

def check_connection():
    try:
        engine = create_engine(SYNC_URL, connect_args={"sslmode": "require"} if "supabase" in SYNC_URL else {})
        with engine.connect() as conn:
            res = conn.execute(text("SELECT current_database(), current_user, version()"))
            db, user, version = res.fetchone()
            print("\n[OK] Connected successfully!")
            print(f"   Database : {db}")
            print(f"   User     : {user}")
            print(f"   Version  : {version[:50]}")

            # List tables
            tables = conn.execute(text("""
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
            """)).fetchall()
            print(f"\n[TABLES] Found {len(tables)} tables:")
            for t in tables:
                print(f"   - {t[0]}.{t[1]}")
    except Exception as e:
        print(f"\n[FAIL] Connection failed: {e}")
        print("Make sure DATABASE_URL in .env is set correctly.")

if __name__ == "__main__":
    check_connection()
