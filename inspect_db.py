import psycopg2
import os

# Database Credentials
DB_HOST = "aws-1-eu-central-1.pooler.supabase.com"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres.ugsezgnkyhcmsdpohuwf"
DB_PASS = "DasInternetRockt2024!"

def inspect_schema():
    try:
        # Connect to Database
        print("Connecting to database...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            sslmode="require"
        )
        cur = conn.cursor()

        # Check if table exists
        print("Checking tables...")
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = cur.fetchall()
        print("Tables in public schema:", [t[0] for t in tables])

        # Check row counts
        print("\nChecking row counts...")
        cur.execute("SELECT COUNT(*) FROM whatsapp_connections")
        print(f"whatsapp_connections rows: {cur.fetchone()[0]}")

    except Exception as e:
        print(f"❌ Error inspecting schema: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    inspect_schema()
