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
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'up_permissions'");
    console.log('up_permissions columns:', cols.rows.map(r => r.column_name));

    const links = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%up_permission%'");
    console.log('up_permissions tables:', links.rows.map(r => r.table_name));

    const allPerms = await client.query("SELECT * FROM up_permissions WHERE action LIKE '%expense%'");
    console.log('Expense permissions in up_permissions:', allPerms.rows);

    const cats = await client.query("SELECT id, name, is_active FROM expense_categories");
    console.log('Categories count:', cats.rows.length, cats.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
