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
        const str = d.toString();
        stdout += str;
        process.stdout.write(str);
        if (str.includes('[sudo]') || str.includes('Password:')) {
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
      console.log(`\n[SFTP] Uploading ${path.basename(localPath)} -> ${remotePath}...`);
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

  console.log('=== CONNECTED TO MASHRUE SERVER ===');

  const baseDir = path.resolve(__dirname, '..', '..');
  const backendZip = path.join(baseDir, 'dist_backend.zip');
  const tenantZip = path.join(baseDir, 'dist_tenant.zip');
  const courierZip = path.join(baseDir, 'dist_courier.zip');

  // 1. Upload all 3 archives
  await uploadFile(conn, backendZip, '/var/www/dbarc/dist_backend.zip');
  await uploadFile(conn, tenantZip, '/var/www/dbarc/dist_tenant.zip');
  await uploadFile(conn, courierZip, '/var/www/dbarc/dist_courier.zip');

  // 2. Extract archives
  console.log('\n=== EXTRACTING PACKAGES ===');
  await runCommand(conn, 'unzip -o -q /var/www/dbarc/dist_backend.zip -d /var/www/dbarc/backend');
  await runCommand(conn, 'unzip -o -q /var/www/dbarc/dist_tenant.zip -d /var/www/dbarc/tenant');
  await runCommand(conn, 'unzip -o -q /var/www/dbarc/dist_courier.zip -d /var/www/dbarc/courier');
  await runCommand(conn, 'rm -f /var/www/dbarc/*.zip');
  console.log('Packages extracted.');

  // 3. Write Backend .env
  console.log('\n=== CONFIGURING BACKEND .ENV ===');
  const backendEnv = `HOST=127.0.0.1
PORT=1337
APP_KEYS=RvnLKYnpzDH3u42Und2/Jg==,+x7Tz/KLzebkvKFm1Nh3gA==,4lDau6fO0xYSE1iOr2S6fA==,vf1JidXQilWVtuf6EGaZ5g==
API_TOKEN_SALT=Amg6CXVP3orYVeMGp+dGow==
ADMIN_JWT_SECRET=IfTgIVj8Ok530ZZaPQ8s+A==
TRANSFER_TOKEN_SALT=Bw5eIHGh9G0rfkYpk9iw5Q==
ENCRYPTION_KEY=rDxV7d0GKE6Y/JBlLyky4A==
JWT_SECRET=1+9olMJ+IgamypaLZxHD/w==

DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=dbarc_db
DATABASE_USERNAME=dbarc_user
DATABASE_PASSWORD=Password123!
DATABASE_SSL=false
PUBLIC_URL=https://api.dbarc.mashrue.com
`;
  await runCommand(conn, `cat << 'EOF' > /var/www/dbarc/backend/.env\n${backendEnv}\nEOF`);

  // 4. Write Frontend .env files
  console.log('\n=== CONFIGURING FRONTEND .ENV FILES ===');
  const tenantEnv = `NEXT_PUBLIC_API_URL=https://api.dbarc.mashrue.com/api
PORT=3000
NODE_ENV=production
`;
  await runCommand(conn, `cat << 'EOF' > /var/www/dbarc/tenant/.env.local\n${tenantEnv}\nEOF`);

  const courierEnv = `NEXT_PUBLIC_API_URL=https://api.dbarc.mashrue.com/api
PORT=3001
NODE_ENV=production
`;
  await runCommand(conn, `cat << 'EOF' > /var/www/dbarc/courier/.env.local\n${courierEnv}\nEOF`);

  // 5. Install & Build Backend
  console.log('\n=== BUILDING BACKEND (Strapi) ===');
  await runCommand(conn, 'cd /var/www/dbarc/backend && npm install --production=false && npm run build');
  await runCommand(conn, 'cd /var/www/dbarc/backend && (pm2 delete dbarc-backend 2>/dev/null || true) && pm2 start npm --name "dbarc-backend" -- run start');

  // 6. Install & Build Tenant
  console.log('\n=== BUILDING TENANT (dbarc.mashrue.com) ===');
  await runCommand(conn, 'cd /var/www/dbarc/tenant && npm install && npm run build');
  await runCommand(conn, 'cd /var/www/dbarc/tenant && (pm2 delete dbarc-tenant 2>/dev/null || true) && pm2 start npm --name "dbarc-tenant" -- start -- -p 3000');

  // 7. Install & Build Courier
  console.log('\n=== BUILDING COURIER (shipzo.mashrue.com) ===');
  await runCommand(conn, 'cd /var/www/dbarc/courier && npm install && npm run build');
  await runCommand(conn, 'cd /var/www/dbarc/courier && (pm2 delete dbarc-courier 2>/dev/null || true) && pm2 start npm --name "dbarc-courier" -- start -- -p 3001');

  // 8. Save PM2 and verify processes
  console.log('\n=== VERIFYING PM2 STATUS ===');
  await runCommand(conn, 'pm2 save');
  const pm2Res = await runCommand(conn, 'pm2 list');
  console.log(pm2Res.stdout);

  conn.end();
  console.log('\n=== ALL SERVICES DEPLOYED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Deployment Failed:', err);
  process.exit(1);
});
