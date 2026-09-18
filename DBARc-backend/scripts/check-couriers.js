const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'dbarc_db',
    user: 'postgres',
    password: 'root',
  });

  try {
    await client.connect();
    const couriers = await client.query("SELECT * FROM couriers");
    console.log('Couriers:', couriers.rows);

    const tenants = await client.query("SELECT * FROM tenants");
    console.log('Tenants:', tenants.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
