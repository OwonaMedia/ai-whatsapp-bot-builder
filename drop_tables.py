import psycopg2
import os

# Database Credentials
DB_HOST = "aws-1-eu-central-1.pooler.supabase.com"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres.ugsezgnkyhcmsdpohuwf"
DB_PASS = "DasInternetRockt2024!"

def drop_legacy_tables():
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

        # Drop tables in correct order (dependents first)
        tables_to_drop = ["bot_analytics", "whatsapp_conversations", "bot_flows", "whatsapp_connections"]
        
        for table in tables_to_drop:
            print(f"Dropping table {table} if exists...")
            cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
        
        conn.commit()
        print("✅ Legacy tables dropped successfully!")

    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    drop_legacy_tables()
