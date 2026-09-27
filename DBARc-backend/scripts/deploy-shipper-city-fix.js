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
      stream.stderr.on('data', (d) => (stderr += d.toString()));
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
        console.log(`SFTP Upload completed for ${path.basename(localPath)}.`);
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

  console.log('Connected to remote production server.');

  // 1. Upload strapi-server files
  const localStrapiServerJs = path.join(__dirname, '..', 'dist', 'src', 'extensions', 'users-permissions', 'strapi-server.js');
  const localStrapiServerTs = path.join(__dirname, '..', 'src', 'extensions', 'users-permissions', 'strapi-server.ts');
  
  if (fs.existsSync(localStrapiServerJs)) {
    await uploadFile(conn, localStrapiServerJs, '/var/www/dbarc/backend/dist/src/extensions/users-permissions/strapi-server.js');
  }
  if (fs.existsSync(localStrapiServerTs)) {
    await uploadFile(conn, localStrapiServerTs, '/var/www/dbarc/backend/src/extensions/users-permissions/strapi-server.ts');
  }

  // 2. Upload office lifecycles files
  const localLifecyclesJs = path.join(__dirname, '..', 'dist', 'src', 'api', 'office', 'content-types', 'office', 'lifecycles.js');
  const localLifecyclesTs = path.join(__dirname, '..', 'src', 'api', 'office', 'content-types', 'office', 'lifecycles.ts');

  if (fs.existsSync(localLifecyclesJs)) {
    await uploadFile(conn, localLifecyclesJs, '/var/www/dbarc/backend/dist/src/api/office/content-types/office/lifecycles.js');
  }
  if (fs.existsSync(localLifecyclesTs)) {
    await uploadFile(conn, localLifecyclesTs, '/var/www/dbarc/backend/src/api/office/content-types/office/lifecycles.ts');
  }

  // 3. Restart backend service
  console.log('Restarting dbarc-backend via PM2 on production...');
  const restartRes = await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log(restartRes.stdout);

  // 4. Wait for Strapi reboot and check logs
  console.log('Waiting 8s for Strapi to boot on production...');
  await new Promise((r) => setTimeout(r, 8000));

  console.log('Checking recent PM2 logs...');
  const logRes = await runCommand(conn, 'pm2 logs dbarc-backend --lines 25 --nostream');
  console.log(logRes.stdout);

  conn.end();
  console.log('Deployment completed successfully!');
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
