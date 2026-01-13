const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres.ugsezgnkyhcmsdpohuwf:DasInternetRockt2024!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function inspectTable() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
    });

    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL...');

        // Check columns
        console.log('\n--- Columns in ebook_proposals ---');
        const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ebook_proposals';
    `);

        if (columnsRes.rows.length === 0) {
            console.log('Table ebook_proposals DOES NOT EXIST!');
        } else {
            columnsRes.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type})`);
            });

            // Check content
            console.log('\n--- Last 5 Rows in ebook_proposals ---');
            const rowsRes = await client.query('SELECT * FROM public.ebook_proposals ORDER BY created_at DESC LIMIT 5');
            rowsRes.rows.forEach(row => {
                console.log(`ID: ${row.id}`);
                console.log(`Topic: ${row.topic}`);
                console.log(`Genre: ${row.genre}`);
                console.log(`Created At: ${row.created_at}`);
                // console.log(`Full Row: ${JSON.stringify(row)}`);
                console.log('---');
            });
        }

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

inspectTable();
