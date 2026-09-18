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
    // Check user 2 and user 10 role and details
    const userRes = await client.query(`
      SELECT u.id, u.username, u.email, r.id as role_id, r.name as role_name, r.type as role_type
      FROM up_users u
      LEFT JOIN up_users_role_lnk lnk ON lnk.user_id = u.id
      LEFT JOIN up_roles r ON r.id = lnk.role_id
      WHERE u.id IN (2, 10, 13)
    `);
    console.log('User roles in DB:', userRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
