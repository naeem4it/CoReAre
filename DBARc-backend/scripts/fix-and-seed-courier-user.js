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
      stream.on('close', (code) => resolve({ code, stdout, stderr }));
      stream.on('data', (d) => {
        const s = d.toString();
        stdout += s;
        if (s.includes('[sudo]') || s.includes('Password:')) stream.write('Password123!\n');
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

  // 1. Upload updated tenant controller
  const localCtrlJs = path.join(__dirname, '..', 'dist', 'src', 'api', 'tenant', 'controllers', 'tenant.js');
  await uploadFile(conn, localCtrlJs, '/var/www/dbarc/backend/dist/src/api/tenant/controllers/tenant.js');

  const localCtrlTs = path.join(__dirname, '..', 'src', 'api', 'tenant', 'controllers', 'tenant.ts');
  await uploadFile(conn, localCtrlTs, '/var/www/dbarc/backend/src/api/tenant/controllers/tenant.ts');

  // 2. Run seed script inside Strapi context on the server
  const seedScript = `
const { createStrapi } = require('@strapi/strapi');
const bcrypt = require('bcryptjs');

async function seed() {
  const app = await createStrapi({ distDir: './dist' }).load();
  console.log('Strapi loaded.');

  const tenant = await app.db.query('api::tenant.tenant').findOne({ where: { id: 1 } });
  if (!tenant) throw new Error('Tenant 1 not found');

  const authenticatedRole = await app.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'authenticated' }
  });

  const superAdminCourierRole = await app.db.query('api::role-definition.role-definition').findOne({
    where: { tenant: 1, role_name: 'Super Admin' }
  }) || await app.db.query('api::role-definition.role-definition').findOne({
    where: { role_name: 'Super Admin' }
  });

  let defaultOffice = await app.db.query('api::office.office').findOne({ where: { tenant: 1 } });
  if (!defaultOffice) {
    defaultOffice = await app.db.query('api::office.office').create({
      data: {
        name: 'Head Office',
        address: 'Main Office, Lahore',
        type: 'courier',
        tenant: 1,
        publishedAt: new Date(),
      }
    });
  }

  // 1. Create or update Courier@Shipzo.com
  let courierUser = await app.db.query('plugin::users-permissions.user').findOne({
    where: {
      $or: [
        { email: 'courier@shipzo.com#1' },
        { email: 'courier@shipzo.com' },
        { username: 'courier#1' },
        { username: 'courier' }
      ]
    }
  });

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  if (!courierUser) {
    console.log('Creating courier@shipzo.com user...');
    courierUser = await app.db.query('plugin::users-permissions.user').create({
      data: {
        username: 'courier#1',
        email: 'courier@shipzo.com#1',
        password: hashedPassword,
        confirmed: true,
        blocked: false,
        provider: 'local',
        tenant: 1,
        role: authenticatedRole.id,
        fullName: 'Shipzo Courier Admin',
      }
    });
  } else {
    console.log('Updating courier@shipzo.com user...');
    await app.db.query('plugin::users-permissions.user').update({
      where: { id: courierUser.id },
      data: {
        password: hashedPassword,
        confirmed: true,
        tenant: 1,
        role: authenticatedRole.id,
      }
    });
  }

  if (courierUser && superAdminCourierRole) {
    await app.db.query('plugin::users-permissions.user').update({
      where: { id: courierUser.id },
      data: {
        role_definition: [superAdminCourierRole.id],
        offices: defaultOffice ? [defaultOffice.id] : []
      }
    });
    console.log('Courier user configured with Super Admin courier role and office.');
  }

  // 2. Also link naeem4it (id 1) to tenant 1 and give courier role
  const naeemUser = await app.db.query('plugin::users-permissions.user').findOne({ where: { id: 1 } });
  if (naeemUser) {
    await app.db.query('plugin::users-permissions.user').update({
      where: { id: 1 },
      data: {
        tenant: 1,
        role_definition: superAdminCourierRole ? [superAdminCourierRole.id] : [],
        offices: defaultOffice ? [defaultOffice.id] : []
      }
    });
    console.log('naeem4it user linked to Tenant 1.');
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/var/www/dbarc/backend/seed_courier.js');
      w.on('close', resolve);
      w.end(seedScript);
    });
  });

  console.log('Executing seed script on remote server...');
  const seedExec = await runCommand(conn, 'cd /var/www/dbarc/backend && node seed_courier.js');
  console.log(seedExec.stdout);

  // 3. Restart PM2
  console.log('Restarting dbarc-backend via PM2...');
  const pm2Res = await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log(pm2Res.stdout);

  console.log('Waiting 8s for Strapi to boot...');
  await new Promise(r => setTimeout(r, 8000));

  // 4. Test login on /api/auth/local with both credentials
  const testLoginScript = `
const http = require('http');

function login(identifier, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ identifier, password });
    const r = http.request({
      hostname: '127.0.0.1',
      port: 1337,
      path: '/api/auth/local',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    r.on('error', reject);
    r.write(data);
    r.end();
  });
}

async function testAll() {
  console.log('--- TESTING /api/auth/local ---');
  
  // Test 1: Courier@Shipzo.com
  const r1 = await login('Courier@Shipzo.com', 'Password123!');
  console.log('Login "Courier@Shipzo.com": status =', r1.status, r1.status === 200 ? 'SUCCESS! JWT obtained, user: ' + r1.body.user?.email : r1.body);

  // Test 2: courier@shipzo.com
  const r2 = await login('courier@shipzo.com', 'Password123!');
  console.log('Login "courier@shipzo.com": status =', r2.status, r2.status === 200 ? 'SUCCESS!' : r2.body);

  // Test 3: naeem4it@gmail.com
  const r3 = await login('naeem4it@gmail.com', '#0321Blouch');
  console.log('Login "naeem4it@gmail.com": status =', r3.status, r3.status === 200 ? 'SUCCESS! JWT obtained, user: ' + r3.body.user?.email : r3.body);
}

testAll().catch(console.error);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/test_login.js');
      w.on('close', resolve);
      w.end(testLoginScript);
    });
  });

  const testLoginRes = await runCommand(conn, 'node /tmp/test_login.js');
  console.log(testLoginRes.stdout);

  conn.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
