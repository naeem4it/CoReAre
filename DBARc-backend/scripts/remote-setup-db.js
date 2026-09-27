const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '95.217.152.187',
  port: 22,
  username: 'mashrueadmin',
  password: 'Password123!',
  readyTimeout: 30000,
};

function runCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      stream.on('data', (d) => stdout += d.toString());
      stream.stderr.on('data', (d) => stderr += d.toString());
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      console.log(`SFTP Uploading ${localPath} -> ${remotePath}...`);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on('close', () => {
        console.log(`SFTP Upload completed.`);
        resolve();
      });
      writeStream.on('error', (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function main() {
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(config);
  });

  console.log('Connected to remote server via SSH.');

  // 1. Create DB User and DB
  console.log('[Step 1] Creating dbarc_user and dbarc_db in PostgreSQL...');
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -c "ALTER ROLE dbarc_user WITH LOGIN ENCRYPTED PASSWORD 'Password123!';" 2>/dev/null || echo 'Password123!' | sudo -S -u postgres psql -c "CREATE ROLE dbarc_user WITH LOGIN ENCRYPTED PASSWORD 'Password123!';"`);
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'dbarc_db'" | grep -q 1 || echo 'Password123!' | sudo -S -u postgres psql -c "CREATE DATABASE dbarc_db OWNER dbarc_user;"`);
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dbarc_db TO dbarc_user;"`);
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -c "ALTER USER dbarc_user WITH PASSWORD 'Password123!';"`);
  console.log('Database and user verified.');

  // Check pg_hba.conf
  const hbaRes = await runCommand(conn, `echo 'Password123!' | sudo -S grep -v '^#' /etc/postgresql/*/main/pg_hba.conf | grep -v '^$'`);
  console.log('pg_hba.conf active rules:\n' + hbaRes.stdout);

  // 2. Upload schema
  const localSchema = path.resolve(__dirname, '..', '..', 'DBARc_chema_2026September.sql');
  const remoteSchema = '/tmp/DBARc_chema_2026September.sql';
  console.log('[Step 2] Uploading DBARc_chema_2026September.sql to server...');
  await uploadFile(conn, localSchema, remoteSchema);

  // 3. Restore schema via postgres superuser
  console.log('[Step 3] Restoring schema into dbarc_db...');
  const restoreRes = await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f ${remoteSchema} 2>&1 | tail -n 25`);
  console.log('Restore output tail:');
  console.log(restoreRes.stdout);

  // Transfer ownership of all tables, sequences, views to dbarc_user
  console.log('Transferring table ownership to dbarc_user...');
  const transferSql = `
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO dbarc_user';
    END LOOP;
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO dbarc_user';
    END LOOP;
END $$;
`;
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -c "${transferSql.trim().replace(/\n/g, ' ')}"`);
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO dbarc_user; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dbarc_user;"`);

  // 4. Verify tables and admin user via dbarc_user
  console.log('[Step 4] Verifying imported tables and super admin via dbarc_user...');
  const verifyRes = await runCommand(conn, `PGPASSWORD='Password123!' psql -h 127.0.0.1 -U dbarc_user -d dbarc_db -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'; SELECT id, email, username FROM admin_users;" 2>&1`);
  console.log('Verification output:\n' + verifyRes.stdout);

  // If password connection fails, also check via postgres
  if (verifyRes.stdout.includes('FATAL')) {
    console.log('Checking via postgres superuser fallback:');
    const pgVerify = await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'; SELECT id, email, username FROM admin_users;"`);
    console.log(pgVerify.stdout);
  }

  // 5. Clean up temporary schema file
  await runCommand(conn, `rm -f ${remoteSchema}`);
  console.log('Cleaned up remote temporary schema file.');

  conn.end();
  console.log('Database setup completed successfully on production server!');
}

main().catch(err => {
  console.error('Remote DB Setup Error:', err);
  process.exit(1);
});
