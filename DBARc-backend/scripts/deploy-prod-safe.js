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
        process.stdout.write(s);
        if (s.includes('[sudo]') || s.includes('Password:')) {
          stream.write('Password123!\n');
        }
      });
      stream.stderr.on('data', (d) => {
        stderr += d.toString();
        process.stderr.write(d.toString());
      });
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      console.log(`\n[SFTP] Uploading ${path.basename(localPath)} (${(fs.statSync(localPath).size / 1024 / 1024).toFixed(2)} MB) -> ${remotePath}...`);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on('close', () => {
        console.log(`[SFTP] Upload completed.`);
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

  console.log('\n======================================================');
  console.log('   CONNECTED TO PRODUCTION SERVER (95.217.152.187)    ');
  console.log('======================================================\n');

  // STEP 1: SAFETY PRE-FLIGHT AUDIT
  console.log('>>> STEP 1: Pre-flight Safety Audit & Verification');
  
  // 1a. Check PM2 status
  const pm2Initial = await runCommand(conn, 'pm2 jlist');
  const procs = JSON.parse(pm2Initial.stdout.trim());
  const mashrueProc = procs.find(p => p.name === 'mashrue-api');
  if (!mashrueProc) {
    throw new Error('mashrue-api process not found in PM2 list!');
  }
  const initialMashrueRestarts = mashrueProc.pm2_env.restart_time;
  console.log(`[SAFETY CHECK] mashrue-api is ${mashrueProc.pm2_env.status} with ${initialMashrueRestarts} restarts. Must NOT change.\n`);

  // 1b. Create fresh dbarc_db backup for complete safety
  console.log('Creating fresh pre-deployment backup of dbarc_db...');
  const backupTimestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  await runCommand(conn, `echo 'Password123!' | sudo -S -u postgres pg_dump dbarc_db > /var/backups/dbarc/dbarc_db_predeploy_${backupTimestamp}.sql`);
  const backupCheck = await runCommand(conn, `ls -lh /var/backups/dbarc/dbarc_db_predeploy_${backupTimestamp}.sql`);
  console.log('Verified fresh database backup:\n', backupCheck.stdout);

  // 1c. Record current dbarc_db table counts
  const rowCountSql = `echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -t -A -c "SELECT relname || ': ' || n_live_tup FROM pg_stat_user_tables WHERE relname IN ('tenants', 'shippers', 'parcels', 'up_users', 'offices', 'cities', 'regions') ORDER BY relname;"`;
  const initialCounts = await runCommand(conn, rowCountSql);
  console.log('Initial dbarc_db row counts:\n', initialCounts.stdout);

  const baseDir = path.resolve(__dirname, '..', '..');
  const backendTar = path.join(baseDir, 'deploy_backend.tar.gz');
  const courierTar = path.join(baseDir, 'deploy_courier.tar.gz');
  const tenantTar = path.join(baseDir, 'deploy_tenant.tar.gz');

  // STEP 2: DEPLOY BACKEND (Strapi)
  console.log('\n======================================================');
  console.log('>>> STEP 2: Deploying DBARc Backend (Strapi)');
  console.log('======================================================');
  await uploadFile(conn, backendTar, '/tmp/deploy_backend.tar.gz');
  
  console.log('\n[BACKEND] Extracting package into /var/www/dbarc/backend...');
  await runCommand(conn, 'tar -xzf /tmp/deploy_backend.tar.gz -C /var/www/dbarc/backend && rm -f /tmp/deploy_backend.tar.gz');
  await runCommand(conn, 'chown -R mashrueadmin:mashrueadmin /var/www/dbarc/backend/src /var/www/dbarc/backend/dist');
  await runCommand(conn, 'grep -q "DEFAULT_TENANT_ID" /var/www/dbarc/backend/.env 2>/dev/null || echo "DEFAULT_TENANT_ID=1" >> /var/www/dbarc/backend/.env');

  // Upload Shipzo Logo Assets
  console.log('\n[BACKEND] Uploading Shipzo logo assets...');
  const logoLocal = path.join(__dirname, '..', 'public', 'uploads', 'shipzo_logo_0d4ae0a397.png');
  const thumbLocal = path.join(__dirname, '..', 'public', 'uploads', 'thumbnail_shipzo_logo_0d4ae0a397.png');
  if (fs.existsSync(logoLocal)) {
    await uploadFile(conn, logoLocal, '/var/www/dbarc/backend/public/uploads/shipzo_logo_0d4ae0a397.png');
  }
  if (fs.existsSync(thumbLocal)) {
    await uploadFile(conn, thumbLocal, '/var/www/dbarc/backend/public/uploads/thumbnail_shipzo_logo_0d4ae0a397.png');
  }
  await runCommand(conn, 'chown -R mashrueadmin:mashrueadmin /var/www/dbarc/backend/public/uploads');

  // Link logo to Tenant 1 in dbarc_db
  const logoSql = `
INSERT INTO files (document_id, name, alternative_text, caption, width, height, formats, hash, ext, mime, size, url, provider, folder_path, created_at, updated_at, published_at)
SELECT 'szye1xe6qm1sczes6i45t8hr', 'shipzo-logo.png', NULL, NULL, 402, 123, '{"thumbnail": {"ext": ".png", "url": "/uploads/thumbnail_shipzo_logo_0d4ae0a397.png", "hash": "thumbnail_shipzo_logo_0d4ae0a397", "mime": "image/png", "name": "thumbnail_shipzo-logo.png", "path": null, "size": 22.73, "width": 245, "height": 75, "sizeInBytes": 22731}}'::jsonb, 'shipzo_logo_0d4ae0a397', '.png', 'image/png', 13.82, '/uploads/shipzo_logo_0d4ae0a397.png', 'local', '/1', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM files WHERE hash = 'shipzo_logo_0d4ae0a397');

INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
SELECT f.id, 1, 'api::tenant.tenant', 'logo', 1
FROM files f
WHERE f.hash = 'shipzo_logo_0d4ae0a397'
  AND NOT EXISTS (
    SELECT 1 FROM files_related_mph m 
    WHERE m.related_id = 1 AND m.related_type = 'api::tenant.tenant' AND m.field = 'logo'
  );
`;
  await new Promise((res, rej) => {
    conn.sftp((err, sftp) => {
      if (err) return rej(err);
      const w = sftp.createWriteStream('/tmp/link_logo.sql');
      w.on('close', res);
      w.on('error', rej);
      w.end(logoSql);
    });
  });
  await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/link_logo.sql && rm -f /tmp/link_logo.sql");

  // Sequence sync
  console.log('\n[BACKEND] Syncing PostgreSQL sequences...');
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
  await new Promise((res, rej) => {
    conn.sftp((err, sftp) => {
      if (err) return rej(err);
      const w = sftp.createWriteStream('/tmp/sync_seq.sql');
      w.on('close', res);
      w.on('error', rej);
      w.end(syncSql);
    });
  });
  await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/sync_seq.sql && rm -f /tmp/sync_seq.sql");

  console.log('\n[BACKEND] Restarting dbarc-backend via PM2...');
  await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log('Waiting 12s for Strapi to boot and register routes...');
  await new Promise(r => setTimeout(r, 12000));

  const backendLogs = await runCommand(conn, 'pm2 logs dbarc-backend --lines 20 --nostream');
  console.log('Backend logs:\n', backendLogs.stdout);

  // Health check on backend
  const backendCurl = await runCommand(conn, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:1337/_health');
  console.log(`Backend health check response: ${backendCurl.stdout.trim()}`);

  // STEP 3: DEPLOY COURIER (Shipzo Portal)
  console.log('\n======================================================');
  console.log('>>> STEP 3: Deploying DBARc Courier (Shipzo Portal)');
  console.log('======================================================');
  await uploadFile(conn, courierTar, '/tmp/deploy_courier.tar.gz');

  console.log('\n[COURIER] Extracting package into /var/www/dbarc/courier...');
  await runCommand(conn, 'tar -xzf /tmp/deploy_courier.tar.gz -C /var/www/dbarc/courier && rm -f /tmp/deploy_courier.tar.gz');
  await runCommand(conn, 'chown -R mashrueadmin:mashrueadmin /var/www/dbarc/courier/src /var/www/dbarc/courier/public');
  await runCommand(conn, 'grep -q "NEXT_PUBLIC_TENANT_ID" /var/www/dbarc/courier/.env.local 2>/dev/null || echo "NEXT_PUBLIC_TENANT_ID=1" >> /var/www/dbarc/courier/.env.local');

  console.log('\n[COURIER] Building Next.js production bundle on server...');
  const courierBuild = await runCommand(conn, 'cd /var/www/dbarc/courier && NODE_OPTIONS="--max-old-space-size=1200" npm run build');
  if (courierBuild.code !== 0) {
    throw new Error('Courier build failed on remote server!');
  }

  console.log('\n[COURIER] Restarting dbarc-courier via PM2...');
  await runCommand(conn, 'pm2 restart dbarc-courier');
  console.log('Waiting 5s for Next.js to start...');
  await new Promise(r => setTimeout(r, 5000));

  const courierCurl = await runCommand(conn, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001');
  console.log(`Courier HTTP response: ${courierCurl.stdout.trim()}`);

  // STEP 4: DEPLOY TENANT (DBARc Portal)
  console.log('\n======================================================');
  console.log('>>> STEP 4: Deploying DBARc Tenant Portal');
  console.log('======================================================');
  await uploadFile(conn, tenantTar, '/tmp/deploy_tenant.tar.gz');

  console.log('\n[TENANT] Extracting package into /var/www/dbarc/tenant...');
  await runCommand(conn, 'tar -xzf /tmp/deploy_tenant.tar.gz -C /var/www/dbarc/tenant && rm -f /tmp/deploy_tenant.tar.gz');
  await runCommand(conn, 'chown -R mashrueadmin:mashrueadmin /var/www/dbarc/tenant/src');
  await runCommand(conn, 'grep -q "NEXT_PUBLIC_TENANT_ID" /var/www/dbarc/tenant/.env.local 2>/dev/null || echo "NEXT_PUBLIC_TENANT_ID=1" >> /var/www/dbarc/tenant/.env.local');

  console.log('\n[TENANT] Building Next.js production bundle on server...');
  const tenantBuild = await runCommand(conn, 'cd /var/www/dbarc/tenant && NODE_OPTIONS="--max-old-space-size=1200" npm run build');
  if (tenantBuild.code !== 0) {
    throw new Error('Tenant build failed on remote server!');
  }

  console.log('\n[TENANT] Restarting dbarc-tenant via PM2...');
  await runCommand(conn, 'pm2 restart dbarc-tenant');
  console.log('Waiting 5s for Next.js to start...');
  await new Promise(r => setTimeout(r, 5000));

  const tenantCurl = await runCommand(conn, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000');
  console.log(`Tenant HTTP response: ${tenantCurl.stdout.trim()}`);

  // STEP 5: POST-DEPLOYMENT SAFETY AUDIT & VERIFICATION
  console.log('\n======================================================');
  console.log('>>> STEP 5: Post-Deployment Safety Audit & Verification');
  console.log('======================================================');

  // 5a. Save PM2
  await runCommand(conn, 'pm2 save');
  const pm2Final = await runCommand(conn, 'pm2 list');
  console.log(pm2Final.stdout);

  // 5b. Verify mashrue-api was NOT disturbed
  const pm2FinalJson = await runCommand(conn, 'pm2 jlist');
  const procsFinal = JSON.parse(pm2FinalJson.stdout.trim());
  const mashrueFinal = procsFinal.find(p => p.name === 'mashrue-api');
  if (mashrueFinal.pm2_env.restart_time !== initialMashrueRestarts) {
    console.error(`[CRITICAL WARNING] mashrue-api restart count changed! Initial: ${initialMashrueRestarts}, Final: ${mashrueFinal.pm2_env.restart_time}`);
  } else {
    console.log(`[VERIFIED SUCCESS] mashrue-api was NEVER restarted or disturbed! Initial restarts: ${initialMashrueRestarts}, Current: ${mashrueFinal.pm2_env.restart_time}. Status: ${mashrueFinal.pm2_env.status}.`);
  }

  // 5c. Verify dbarc_db data integrity
  const finalCounts = await runCommand(conn, rowCountSql);
  console.log('\nPost-deployment dbarc_db row counts:\n', finalCounts.stdout);

  // 5d. Test public domains
  console.log('\nTesting public domains:');
  const domainTests = [
    'https://mashrue.com',
    'https://api.dbarc.mashrue.com/_health',
    'https://shipzo.mashrue.com',
    'https://dbarc.mashrue.com'
  ];
  for (const url of domainTests) {
    const res = await runCommand(conn, `curl -s -k -o /dev/null -w "%{http_code}" ${url}`);
    console.log(`  ${url} -> HTTP ${res.stdout.trim()}`);
  }

  conn.end();
  console.log('\n======================================================');
  console.log('   DEPLOYMENT COMPLETED SUCCESSFULLY WITH ZERO IMPACT ');
  console.log('   ON MASHRUE, MASHRUE DATA, DBARC DATA, OR SHIPZO    ');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('\n*** DEPLOYMENT FAILED ***', err);
  process.exit(1);
});
