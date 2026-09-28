const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5432/dbarc_db' });

async function check() {
  await client.connect();
  const resCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'riders';");
  console.log('Riders columns:', resCols.rows.map(r => r.column_name));
  
  const resRiders = await client.query('SELECT * FROM riders;');
  console.log('Riders count:', resRiders.rows.length);
  console.log('Riders:', resRiders.rows);

  const resUsers = await client.query('SELECT id, username, email FROM up_users;');
  console.log('Users:', resUsers.rows);

  // Check link table between user and rider if any
  const resLinks = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%rider%';");
  console.log('Rider related tables:', resLinks.rows.map(r => r.table_name));

  await client.end();
}
check().catch(console.error);
