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
      console.log(`[SFTP] Uploading ${path.basename(localPath)} -> ${remotePath}...`);
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

  console.log('Connected to server.');

  const localFile = path.resolve(__dirname, '..', '..', 'DBARc-Tenant', 'src', 'features', 'courier', 'ui', 'CourierShipmentsTable.tsx');
  const remoteFile = '/var/www/dbarc/tenant/src/features/courier/ui/CourierShipmentsTable.tsx';
  await uploadFile(conn, localFile, remoteFile);

  console.log('\n=== BUILDING TENANT (dbarc.mashrue.com) ===');
  const buildRes = await runCommand(conn, 'cd /var/www/dbarc/tenant && npm run build');
  console.log('Build Exit Code:', buildRes.code);

  console.log('\n=== RESTARTING ALL PM2 PROCESSES ===');
  await runCommand(conn, 'cd /var/www/dbarc/backend && (pm2 restart dbarc-backend || pm2 start npm --name "dbarc-backend" -- run start)');
  await runCommand(conn, 'cd /var/www/dbarc/tenant && (pm2 restart dbarc-tenant || pm2 start npm --name "dbarc-tenant" -- start -- -p 3000)');
  await runCommand(conn, 'cd /var/www/dbarc/courier && (pm2 restart dbarc-courier || pm2 start npm --name "dbarc-courier" -- start -- -p 3001)');
  await runCommand(conn, 'pm2 save');
  const pm2Status = await runCommand(conn, 'pm2 list');
  console.log(pm2Status.stdout);

  conn.end();
}

main().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
