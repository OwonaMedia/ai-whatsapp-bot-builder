const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.ugsezgnkyhcmsdpohuwf:DasInternetRockt2024!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const migrationFile = path.join(__dirname, '../supabase/migrations/019_n8n_workflow_checkpoints.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase connection pooling sometimes
});

async function runLegacyMigration() {
    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL...');

        console.log('Applying migration:', path.basename(migrationFile));
        await client.query(sql);

        console.log('Success! Table n8n_workflow_checkpoints created.');
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runLegacyMigration();
