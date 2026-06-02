import asyncio
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://erp:ErpSecure2025@localhost:5432/erp_db"
# Fallback to postgres user
DATABASE_URL_FALLBACK = "postgresql://postgres:postgres@localhost:5432/"

def check_connection():
    print("Testing connection with user 'erp' to 'erp_db' on localhost...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT current_database(), current_user"))
            db, user = res.fetchone()
            print(f"Connected! Database: {db}, User: {user}")
            
            # List tables
            tables = conn.execute(text("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            """)).fetchall()
            print(f"Tables found ({len(tables)}):")
            for t in tables:
                print(f" - {t[0]}.{t[1]}")
    except Exception as e:
        print(f"Failed to connect to erp_db: {e}")
        print("\nTesting connection with user 'postgres' to default db...")
        try:
            engine = create_engine(DATABASE_URL_FALLBACK)
            with engine.connect() as conn:
                res = conn.execute(text("SELECT current_database(), current_user"))
                db, user = res.fetchone()
                print(f"Connected! Database: {db}, User: {user}")
                
                # List databases
                dbs = conn.execute(text("SELECT datname FROM pg_database")).fetchall()
                print("Databases found:")
                for d in dbs:
                    print(f" - {d[0]}")
        except Exception as ex:
            print(f"Fallback connection failed: {ex}")

if __name__ == "__main__":
    check_connection()
