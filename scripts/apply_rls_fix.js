const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'postgresql://postgres.ugsezgnkyhcmsdpohuwf:DasInternetRockt2024!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function applyMigration() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
    });

    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL...');

        const migrationPath = path.join(__dirname, '../supabase/migrations/020_ebook_proposals_policy.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration 020_ebook_proposals_policy.sql...');
        await client.query(migrationSql);

        console.log('Migration applied successfully!');

    } catch (err) {
        console.error('Error applying migration:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

applyMigration();
