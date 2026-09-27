const { Client } = require('ssh2');
const bcrypt = require('bcryptjs');

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

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(config);
  });

  const targetPassword = '#0321Blouch';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(targetPassword, salt);
  console.log('Generated hash for #0321Blouch:', hash);

  const updateSql = `
UPDATE public.up_users 
SET 
  username = 'naeem4it',
  email = 'naeem4it@gmail.com',
  provider = 'local',
  password = '${hash}',
  confirmed = true,
  blocked = false,
  updated_at = NOW()
WHERE id = 1;

INSERT INTO public.up_users_role_lnk (user_id, role_id)
SELECT 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.up_users_role_lnk WHERE user_id = 1
);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/seed_up_user.sql');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(updateSql);
    });
  });

  const psqlRes = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/seed_up_user.sql");
  console.log('psql update result:', psqlRes.stdout);

  // Now test both /admin/login and /api/auth/local via remote test script
  const testScript = `
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 1337,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing Admin Login (/admin/login)...');
  const adminRes = await post('/admin/login', {
    email: 'naeem4it@gmail.com',
    password: '#0321Blouch'
  });
  console.log('Admin Status:', adminRes.status);
  console.log('Admin Body:', adminRes.body.slice(0, 150));

  console.log('\\nTesting Local User Login (/api/auth/local)...');
  const localRes = await post('/api/auth/local', {
    identifier: 'naeem4it@gmail.com',
    password: '#0321Blouch'
  });
  console.log('Local Status:', localRes.status);
  console.log('Local Body:', localRes.body.slice(0, 150));
}

run().catch(console.error);
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/test_both_logins.js');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(testScript);
    });
  });

  const testExec = await runCommand(conn, 'node /tmp/test_both_logins.js');
  console.log(testExec.stdout);

  conn.end();
}

main().catch(console.error);
