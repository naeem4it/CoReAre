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

  console.log('Connected to remote server. Running remote test for shipper creation...');

  const testScript = `
const http = require('http');

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 1337,
      path: path,
      method: 'POST',
      headers: headers,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  // 1. Login as Admin
  console.log('1. Logging in as naeem4it@gmail.com...');
  const loginRes = await post('/admin/login', {
    email: 'naeem4it@gmail.com',
    password: '#0321Blouch'
  });

  if (!loginRes.data || !loginRes.data.data?.token) {
    console.error('Failed to log in as admin:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.data.token;
  const tenantId = 1;
  console.log('Logged in successfully with admin token.');

  // 2. Test Shipper creation with city "Lahore"
  const testUsername = 'test_shipper_' + Date.now();
  const testEmail = testUsername + '@test.com';
  console.log('2. Creating shipper admin with city "Lahore":', testUsername);

  const payload = {
    username: testUsername,
    email: testEmail,
    fullName: 'Test Shipper Admin',
    phone: '03001234567',
    confirmationType: 'no_confirmation',
    password: 'Password123!',
    isenable: true,
    tenant: tenantId,
    shipper: [
      {
        name: 'Test Business Lahore',
        address: '123 Test Street, Gulberg',
        city: 'Lahore',
        payment_method: 'Cash',
        planId: 1
      }
    ],
    shipper_roles: ['shipper admin'],
    role_definition: []
  };

  const createRes = await post('/api/tenant/users/create', payload, token);
  console.log('Creation response status:', createRes.status);
  console.log('Creation response body:', JSON.stringify(createRes.data || createRes.text, null, 2));

  if (createRes.status === 200 || createRes.status === 201) {
    console.log('SUCCESS! Shipper created with city "Lahore" without any SQL/integer syntax errors!');
  } else {
    console.error('FAILED to create shipper:', createRes);
    process.exit(1);
  }
}

run().catch(console.error);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const writeStream = sftp.createWriteStream('/tmp/test_shipper.js');
      writeStream.on('close', resolve);
      writeStream.on('error', reject);
      writeStream.end(testScript);
    });
  });

  const runRes = await runCommand(conn, 'node /tmp/test_shipper.js');
  console.log(runRes.stdout);
  if (runRes.stderr) console.error(runRes.stderr);

  conn.end();
}

main().catch(console.error);
