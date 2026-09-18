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
    const users = await client.query("SELECT id, username, email FROM up_users");
    console.log('Users:', users.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
