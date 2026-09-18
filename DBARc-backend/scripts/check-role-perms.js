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
    const roleLnks = await client.query(`
      SELECT p.id, p.action, r.id as role_id, r.name as role_name
      FROM up_permissions p
      LEFT JOIN up_permissions_role_lnk lnk ON lnk.permission_id = p.id
      LEFT JOIN up_roles r ON r.id = lnk.role_id
      WHERE p.action LIKE '%expense%'
    `);
    console.log('Expense permissions with roles:', roleLnks.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
