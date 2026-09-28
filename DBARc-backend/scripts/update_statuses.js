const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5432/dbarc_db' });

async function update() {
  await client.connect();
  // Ensure delivery sheet 1 parcels have status 'Out for Delivery'
  await client.query("UPDATE parcels SET status = 'Out for Delivery' WHERE id IN (59, 60, 63, 152);");
  console.log('Updated parcels 59, 60, 63, 152 to Out for Delivery');

  // Set test parcels to 'Arrived at warehouse (Dest)'
  await client.query("UPDATE parcels SET status = 'Arrived at warehouse (Dest)' WHERE id IN (61, 62, 151);");
  console.log('Updated parcels 61, 62, 151 to Arrived at warehouse (Dest)');

  const res = await client.query("SELECT id, tracking_number, status FROM parcels WHERE id IN (59, 60, 61, 62, 63, 151, 152);");
  console.log('Current statuses:');
  console.log(res.rows);
  await client.end();
}
update().catch(console.error);
