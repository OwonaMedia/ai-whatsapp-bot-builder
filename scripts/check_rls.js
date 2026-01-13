const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres.ugsezgnkyhcmsdpohuwf:DasInternetRockt2024!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function checkRLS() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
    });

    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL...');

        console.log('\n--- RLS Policies for ebook_proposals ---');
        const res = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'ebook_proposals';
    `);

        if (res.rows.length === 0) {
            console.log('No policies found for ebook_proposals. (Check if RLS is enabled on table)');

            const rlsEnabledRes = await client.query(`
        SELECT relname, relrowsecurity 
        FROM pg_class 
        WHERE relname = 'ebook_proposals';
      `);
            if (rlsEnabledRes.rows.length > 0) {
                console.log(`RLS Enabled: ${rlsEnabledRes.rows[0].relrowsecurity}`);
            }
        } else {
            res.rows.forEach(row => {
                console.log(`\nPolicy: ${row.policyname}`);
                console.log(`Command: ${row.command}`);
                console.log(`Roles: ${row.roles}`);
                console.log(`Using (qual): ${row.qual}`);
                console.log(`With Check: ${row.with_check}`);
            });
        }

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

checkRLS();
