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
    conn.exec(cmd, { pty: true }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      stream.on('data', (d) => {
        const s = d.toString();
        stdout += s;
        if (s.includes('[sudo]') || s.includes('Password:')) {
          stream.write('Password123!\n');
        }
      });
      stream.stderr.on('data', (d) => stderr += d.toString());
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      console.log(`SFTP Uploading ${path.basename(localPath)} -> ${remotePath}...`);
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

  console.log('Connected to remote server.');

  // 1. Upload updated dist/src/index.js
  const localIndexJs = path.join(__dirname, '..', 'dist', 'src', 'index.js');
  await uploadFile(conn, localIndexJs, '/var/www/dbarc/backend/dist/src/index.js');

  // Also upload the TypeScript source for completeness
  const localIndexTs = path.join(__dirname, '..', 'src', 'index.ts');
  await uploadFile(conn, localIndexTs, '/var/www/dbarc/backend/src/index.ts');

  // Upload compiled dist/src/extensions/users-permissions/strapi-server.js
  const localExtJs = path.join(__dirname, '..', 'dist', 'src', 'extensions', 'users-permissions', 'strapi-server.js');
  await uploadFile(conn, localExtJs, '/var/www/dbarc/backend/dist/src/extensions/users-permissions/strapi-server.js');

  // Upload source ts file
  const localExtTs = path.join(__dirname, '..', 'src', 'extensions', 'users-permissions', 'strapi-server.ts');
  await uploadFile(conn, localExtTs, '/var/www/dbarc/backend/src/extensions/users-permissions/strapi-server.ts');

  // 2. Synchronize all PostgreSQL sequences on production
  console.log('Synchronizing all PostgreSQL sequences on production...');
  const syncSql = `
DO $$
DECLARE
    rec RECORD;
    max_val BIGINT;
BEGIN
    FOR rec IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            cc.column_name,
            pg_get_serial_sequence('"' || tc.table_schema || '"."' || tc.table_name || '"', cc.column_name) AS seq_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage cc 
            ON tc.constraint_name = cc.constraint_name 
            AND tc.table_schema = cc.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_schema = 'public'
    LOOP
        IF rec.seq_name IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I.%I', rec.column_name, rec.table_schema, rec.table_name) INTO max_val;
            IF max_val > 0 THEN
                EXECUTE format('SELECT setval(%L, %s, true)', rec.seq_name, max_val);
            ELSE
                EXECUTE format('SELECT setval(%L, 1, false)', rec.seq_name);
            END IF;
        END IF;
    END LOOP;
END $$;
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/sync_seq.sql');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(syncSql);
    });
  });

  const psqlRes = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/sync_seq.sql");
  console.log('Sequence sync output:', psqlRes.stdout);

  // 3. Restart backend
  console.log('Restarting dbarc-backend via PM2...');
  const restartRes = await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log(restartRes.stdout);

  console.log('Waiting 8s for Strapi to boot...');
  await new Promise(r => setTimeout(r, 8000));

  // 4. Test endpoints directly on the server
  const testScript = `
const http = require('http');

function req(options, postData) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, data: b }); }
      });
    });
    r.on('error', reject);
    if (postData) r.write(JSON.stringify(postData));
    r.end();
  });
}

async function testAll() {
  console.log('--- TESTING ON PRODUCTION SERVER ---');

  // Step 1: Admin login
  const login = await req({
    hostname: '127.0.0.1', port: 1337, path: '/admin/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'naeem4it@gmail.com', password: '#0321Blouch' });
  console.log('1. Admin Login status:', login.status);
  const token = login.data?.data?.token;
  if (!token) throw new Error('No token: ' + JSON.stringify(login.data));

  // Step 2: Content API /api/tenant/list with Admin Bearer token
  const tenants = await req({
    hostname: '127.0.0.1', port: 1337, path: '/api/tenant/list', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  console.log('2. GET /api/tenant/list status:', tenants.status);

  // Step 3: Content API /api/users with Admin Bearer token
  const users = await req({
    hostname: '127.0.0.1', port: 1337, path: '/api/users?populate=*', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  console.log('3. GET /api/users status:', users.status, 'Total users:', Array.isArray(users.data) ? users.data.length : 'ok');

  // Step 4: Provision Tenant
  const testTenant = {
    name: 'Verification Courier ' + Date.now().toString().slice(-4),
    domain: 'verify' + Date.now().toString().slice(-4) + '.mashrue.com',
    address: 'Gulberg III, Lahore',
    plan: 'Basic',
    commissionPct: 2.0,
    status: 'active',
    features: {
      tplAggregation: true,
      liveRiderTracking: true,
      smsNotifications: true,
      doorstepDigitalPay: false,
      pakistanTaxEngine: true
    },
    adminUsername: 'vadmin_' + Date.now().toString().slice(-4),
    adminFullName: 'Verification Admin',
    adminEmail: 'vadmin_' + Date.now().toString().slice(-4) + '@verify.com',
    adminPassword: 'Password123!',
    confirmationType: 'no_confirmation'
  };

  const prov = await req({
    hostname: '127.0.0.1', port: 1337, path: '/api/tenant/provision', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  }, testTenant);

  console.log('4. POST /api/tenant/provision status:', prov.status);
  console.log('Provisioning result:', JSON.stringify(prov.data));

  if (prov.status === 200 || prov.status === 201) {
    console.log('\\n>>> PRODUCTION PROVISIONING TEST PASSED COMPLETELY! <<<');
  } else {
    console.error('\\n>>> PROD PROVISIONING FAILED! <<<');
  }
}

testAll().catch(console.error);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/test_prod_fix.js');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(testScript);
    });
  });

  const testExec = await runCommand(conn, 'node /tmp/test_prod_fix.js');
  console.log(testExec.stdout);

  conn.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
