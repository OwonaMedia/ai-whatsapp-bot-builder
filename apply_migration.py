import psycopg2
import os

# Database Credentials
DB_HOST = "aws-1-eu-central-1.pooler.supabase.com"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres.ugsezgnkyhcmsdpohuwf"
DB_PASS = "DasInternetRockt2024!"

# SQL File Path
MIGRATION_FILE = "/Users/salomon/Documents/products/ai-whatsapp-bot-builder/supabase/migrations/whatsapp_connections.sql"

def apply_migration():
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

        # Read SQL File
        print(f"Reading migration file: {MIGRATION_FILE}")
        with open(MIGRATION_FILE, 'r') as f:
            sql_content = f.read()

        # Execute SQL
        print("Executing SQL...")
        cur.execute(sql_content)
        conn.commit()

        print("✅ Migration applied successfully!")

    except Exception as e:
        print(f"❌ Error applying migration: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    apply_migration()
