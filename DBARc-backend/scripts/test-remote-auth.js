const { Client } = require('ssh2');

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
      stream.on('data', (d) => stdout += d.toString());
      stream.stderr.on('data', (d) => stderr += d.toString());
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

  const testScript = `
const http = require('http');

async function testAuth() {
  // Test strapi users-permissions login
  const postData = JSON.stringify({
    identifier: 'naeem4it@gmail.com',
    password: '#0321Blouch'
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 1337,
    path: '/api/auth/local',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      console.log('Local Auth Status:', res.statusCode);
      try {
        const json = JSON.parse(body);
        if (json.jwt) {
          console.log('JWT login SUCCESS for naeem4it@gmail.com! User ID:', json.user && json.user.id, 'Email:', json.user && json.user.email);
        } else {
          console.log('Response:', body);
        }
      } catch (e) {
        console.log('Body:', body);
      }
    });
  });

  req.on('error', e => console.error('Req error:', e));
  req.write(postData);
  req.end();
}

testAuth();
`;

  console.log('Writing /tmp/test-auth.js on server...');
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/test-auth.js');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(testScript);
    });
  });

  console.log('Running /tmp/test-auth.js on server...');
  const res = await runCommand(conn, 'node /tmp/test-auth.js');
  console.log(res.stdout);

  conn.end();
}

main().catch(console.error);
