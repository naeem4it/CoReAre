const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Load environment variables from DBARc-backend/.env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envVars = {
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'dbarc_db',
    DATABASE_USERNAME: 'postgres',
    DATABASE_PASSWORD: 'root',
  };

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key) envVars[key] = val;
      }
    }
  }
  return envVars;
}

function findPsql() {
  try {
    execSync('where psql', { stdio: 'ignore' });
    return 'psql';
  } catch (e) {}

  const candidates = [
    'D:\\CoReAre\\PostgresSQL\\bin\\psql.exe',
    'D:\\CoReAre\\PostgreSQL\\14\\bin\\psql.exe',
    'D:\\PostgreSQL\\bin\\psql.exe',
    'D:\\PostgresSQL\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const env = loadEnv();
  const host = env.DATABASE_HOST || '127.0.0.1';
  const port = parseInt(env.DATABASE_PORT || '5432', 10);
  const user = env.DATABASE_USERNAME || 'postgres';
  const password = env.DATABASE_PASSWORD || 'root';
  const dbName = env.DATABASE_NAME || 'dbarc_db';

  console.log('-------------------------------------------------------');
  console.log(`[DB Setup] Target Server : ${host}:${port}`);
  console.log(`[DB Setup] User          : ${user}`);
  console.log(`[DB Setup] Database Name : ${dbName}`);
  console.log('-------------------------------------------------------');

  // Step 1: Connect to default maintenance database 'postgres'
  const rootClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
    connectionTimeoutMillis: 10000,
  });

  try {
    await rootClient.connect();
    console.log('[DB Setup] Connected to PostgreSQL server successfully.');

    // Check if database exists
    const checkDbRes = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`[DB Setup] Database "${dbName}" does not exist. Creating...`);
      await rootClient.query(`CREATE DATABASE "${dbName}";`);
      console.log(`[DB Setup] Database "${dbName}" created successfully.`);
    } else {
      console.log(`[DB Setup] Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error(`[DB Setup ERROR] Failed to connect or create database:`, err.message);
    process.exit(1);
  } finally {
    await rootClient.end();
  }

  // Step 2: Connect to target database 'dbarc_db' and check tables
  const targetClient = new Client({
    host,
    port,
    user,
    password,
    database: dbName,
    connectionTimeoutMillis: 10000,
  });

  try {
    await targetClient.connect();
    const countRes = await targetClient.query(
      `SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';`
    );
    const tableCount = countRes.rows[0]?.count || 0;
    console.log(`[DB Setup] Database "${dbName}" currently contains ${tableCount} table(s).`);

    if (tableCount === 0) {
      console.log(`[DB Setup] Database is empty. Restoring schema from DBARc_Schema_2026June2.sql...`);
      const schemaFile = path.resolve(__dirname, '..', '..', 'DBARc_Schema_2026June2.sql');
      if (!fs.existsSync(schemaFile)) {
        console.warn(`[DB Setup WARNING] Schema file not found at: ${schemaFile}`);
      } else {
        const psqlBin = findPsql();
        if (psqlBin) {
          console.log(`[DB Setup] Restoring via ${psqlBin}...`);
          try {
            execSync(`"${psqlBin}" -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${schemaFile}"`, {
              env: { ...process.env, PGPASSWORD: password },
              stdio: 'inherit',
            });
            console.log('[DB Setup] Schema restored successfully.');
          } catch (execErr) {
            console.error('[DB Setup ERROR] Error while restoring schema:', execErr.message);
          }
        } else {
          console.warn('[DB Setup WARNING] psql binary not found in standard paths. Please add psql to PATH to import schema.');
        }
      }
    } else {
      console.log(`[DB Setup] Tables already present. Preserving existing QA database schema.`);
    }
  } catch (err) {
    console.error(`[DB Setup ERROR] Failed to query target database:`, err.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[DB Setup ERROR]', err);
  process.exit(1);
});
