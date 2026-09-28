const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5432/dbarc_db' });

async function check() {
  await client.connect();
  const resCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cities';");
  console.log('Cities columns:', resCols.rows.map(r => r.column_name));
  const resCities = await client.query('SELECT * FROM cities;');
  console.log('Cities data:', resCities.rows);
  await client.end();
}
check().catch(console.error);
