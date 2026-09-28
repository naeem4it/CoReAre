const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5432/dbarc_db' });

async function check() {
  await client.connect();
  const res = await client.query("SELECT id, tracking_number, status FROM parcels WHERE status ILIKE '%arrived%' OR status ILIKE '%dest%' OR status ILIKE '%out%' ORDER BY id DESC;");
  console.log('Count:', res.rows.length);
  console.log(res.rows);
  await client.end();
}
check();
