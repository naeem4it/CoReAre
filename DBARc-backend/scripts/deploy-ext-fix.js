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

  // Upload compiled dist/src/extensions/users-permissions/strapi-server.js
  const localJs = path.join(__dirname, '..', 'dist', 'src', 'extensions', 'users-permissions', 'strapi-server.js');
  await uploadFile(conn, localJs, '/var/www/dbarc/backend/dist/src/extensions/users-permissions/strapi-server.js');

  // Upload source ts file
  const localTs = path.join(__dirname, '..', 'src', 'extensions', 'users-permissions', 'strapi-server.ts');
  await uploadFile(conn, localTs, '/var/www/dbarc/backend/src/extensions/users-permissions/strapi-server.ts');

  console.log('Restarting dbarc-backend via PM2...');
  const restartRes = await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log(restartRes.stdout);

  console.log('Waiting 8s for Strapi to boot...');
  await new Promise(r => setTimeout(r, 8000));

  console.log('Running full verification test on production server...');
  const testRes = await runCommand(conn, 'node /tmp/test_prod_fix.js');
  console.log(testRes.stdout);

  conn.end();
}

main().catch(console.error);
