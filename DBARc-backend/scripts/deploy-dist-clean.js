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

  console.log('Connected to SSH.');

  const localZip = path.join(__dirname, '..', 'dist_backend_clean.zip');
  await uploadFile(conn, localZip, '/var/www/dbarc/backend/dist_clean.zip');

  console.log('Extracting dist_clean.zip on remote server...');
  await runCommand(conn, 'mkdir -p /var/www/dbarc/backend/dist && unzip -o -q /var/www/dbarc/backend/dist_clean.zip -d /var/www/dbarc/backend/dist && rm -f /var/www/dbarc/backend/dist_clean.zip');

  console.log('Restarting dbarc-backend via PM2...');
  const restartRes = await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log(restartRes.stdout);

  console.log('Waiting 12s for Strapi to load all 45 models and sync DB...');
  await new Promise(r => setTimeout(r, 12000));

  const logRes = await runCommand(conn, 'pm2 logs dbarc-backend --lines 25 --nostream');
  console.log('Backend logs:\n', logRes.stdout);

  const tablesRes = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -c '\\dt'");
  console.log('Tables in dbarc_db now:\n', tablesRes.stdout);

  conn.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
