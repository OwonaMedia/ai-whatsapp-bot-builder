const { Client } = require('pg');

const connectionString = 'postgresql://postgres.ugsezgnkyhcmsdpohuwf:DasInternetRockt2024!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function inspectCheckpoints() {
    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL...');

        console.log('Querying n8n_workflow_checkpoints (last 5 rows)...');
        // Select all columns to see what's being saved
        const res = await client.query('SELECT * FROM public.n8n_workflow_checkpoints ORDER BY created_at DESC LIMIT 5');

        if (res.rows.length === 0) {
            console.log('No rows found in n8n_workflow_checkpoints.');
        } else {
            res.rows.forEach((row, i) => {
                console.log(`\n--- Row ${i + 1} ---`);
                console.log('ID:', row.id);
                console.log('Workflow ID:', row.workflow_id);
                console.log('Execution ID:', row.execution_id);
                console.log('Step Name:', row.step_name);
                console.log('Data:', JSON.stringify(row.data, null, 2));
                console.log('Created At:', row.created_at);
            });
        }

    } catch (err) {
        console.error('Error querying table:', err);
    } finally {
        await client.end();
    }
}

inspectCheckpoints();
