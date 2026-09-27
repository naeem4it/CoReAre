const { Client } = require('ssh2');

const config = {
  host: '95.217.152.187',
  port: 22,
  username: 'mashrueadmin',
  password: 'Password123!',
  readyTimeout: 20000,
};

function runRemoteCommand(cmd, sudo = false) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let stdout = '';
        let stderr = '';
        stream.on('close', (code, signal) => {
          conn.end();
          resolve({ code, stdout, stderr });
        });
        stream.on('data', (data) => {
          const str = data.toString();
          stdout += str;
          if (str.includes('[sudo]') || str.includes('Password:')) {
            stream.write('Password123!\n');
          }
        });
        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
    conn.on('error', (err) => {
      reject(err);
    });
    conn.connect(config);
  });
}

async function main() {
  const cmd = process.argv.slice(2).join(' ') || 'whoami && hostname && uptime';
  console.log(`Connecting to ${config.username}@${config.host}...`);
  console.log(`Executing: ${cmd}`);
  const res = await runRemoteCommand(cmd);
  console.log('--- STDOUT ---');
  console.log(res.stdout);
  if (res.stderr) {
    console.log('--- STDERR ---');
    console.log(res.stderr);
  }
  console.log(`Exit Code: ${res.code}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Remote Exec Error:', err);
    process.exit(1);
  });
}

module.exports = { runRemoteCommand, config };
