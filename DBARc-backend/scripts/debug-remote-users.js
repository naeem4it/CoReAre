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

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(config);
  });

  const testScript = `
const http = require('http');

function req(path, method, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const r = http.request({ hostname: '127.0.0.1', port: 1337, path, method, headers }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const login = await req('/admin/login', 'POST', null, { email: 'naeem4it@gmail.com', password: '#0321Blouch' });
  const token = JSON.parse(login.body).data.token;
  console.log('Login status:', login.status);

  for (const endpoint of ['/api/tenant/list', '/api/couriers', '/api/shippers', '/api/users']) {
    const res = await req(endpoint, 'GET', token);
    console.log(endpoint, '-> status:', res.status, 'body:', res.body.slice(0, 150));
  }
}

run().catch(console.error);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/debug_users.js');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(testScript);
    });
  });

  const res = await runCommand(conn, 'node /tmp/debug_users.js');
  console.log(res.stdout);

  conn.end();
}

main().catch(console.error);
