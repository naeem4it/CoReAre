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

  const cleanupScript = `
const http = require('http');

function del(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 1337,
      path: path,
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const loginRes = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: 'naeem4it@gmail.com', password: '#0321Blouch' });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 1337,
      path: '/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const token = loginRes.data?.token;
  if (!token) return console.log('No admin token');

  // Delete test user id: 3
  const uRes = await del('/api/users/3', token);
  console.log('Delete test user 3 status:', uRes.status);

  // Delete test shipper id: 3
  const sRes = await del('/api/shippers/3', token);
  console.log('Delete test shipper 3 status:', sRes.status);

  // Delete test office id: 9
  const oRes = await del('/api/offices/9', token);
  console.log('Delete test office 9 status:', oRes.status);
}

run().catch(console.error);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/cleanup_test.js');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(cleanupScript);
    });
  });

  const res = await runCommand(conn, 'node /tmp/cleanup_test.js');
  console.log(res.stdout);

  conn.end();
}

main().catch(console.error);
