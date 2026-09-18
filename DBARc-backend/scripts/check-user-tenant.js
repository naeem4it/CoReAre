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
      SELECT u.id, u.username, u.email, t.id as tenant_id, t.name as tenant_name
      FROM up_users u
      LEFT JOIN up_users_tenant_lnk lnk ON lnk.user_id = u.id
      LEFT JOIN tenants t ON t.id = lnk.tenant_id
      WHERE u.id IN (2, 10)
    `);
    console.log('User tenants:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
