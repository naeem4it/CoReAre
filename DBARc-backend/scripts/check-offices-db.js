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
    const res = await client.query(`
      SELECT o.id, o.name, o.address, o.type, 
             lnk_t.tenant_id, t.name as tenant_name,
             lnk_c.courier_id
      FROM offices o
      LEFT JOIN offices_tenant_lnk lnk_t ON lnk_t.office_id = o.id
      LEFT JOIN tenants t ON t.id = lnk_t.tenant_id
      LEFT JOIN offices_courier_lnk lnk_c ON lnk_c.office_id = o.id
    `);
    console.log('Offices in DB:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
