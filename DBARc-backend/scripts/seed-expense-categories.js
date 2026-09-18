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
    console.log('Connected to Postgres.');

    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%expense%'");
    console.log('Expense tables:', tables.rows.map(r => r.table_name));

    if (tables.rows.some(r => r.table_name === 'expense_categories')) {
      const defaultCategories = [
        'Fuel & Travel',
        'Vehicle Maintenance & Repair',
        'Office Rent & Utilities',
        'Packaging & Supplies',
        'Rider / Staff Advances & Allowances',
        'Refreshments & Food',
        'Marketing',
        'Miscellaneous'
      ];

      for (const name of defaultCategories) {
        const existing = await client.query("SELECT id, name FROM expense_categories WHERE name = $1", [name]);
        if (existing.rows.length === 0) {
          await client.query(
            "INSERT INTO expense_categories (name, description, is_active, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
            [name, `Default operational category for ${name}`, true]
          );
          console.log(`Inserted category: "${name}"`);
        } else {
          console.log(`Category already exists: "${name}"`);
        }
      }

      const all = await client.query("SELECT id, name, is_active FROM expense_categories");
      console.log('Current expense categories in DB:', all.rows);
    } else {
      console.log('Table expense_categories not found yet.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
