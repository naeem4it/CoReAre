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
const { createStrapi } = require('@strapi/strapi');

async function test() {
  const app = await createStrapi({ distDir: './dist' }).load();
  console.log('sessionManager exists:', !!app.sessionManager);
  
  // Test with actual login token
  const http = require('http');
  const loginRes = await new Promise((resolve, reject) => {
    const r = http.request({
      hostname: '127.0.0.1', port: 1337, path: '/admin/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    r.on('error', reject);
    r.write(JSON.stringify({ email: 'naeem4it@gmail.com', password: '#0321Blouch' }));
    r.end();
  });

  const token = loginRes.data.token;
  console.log('Got token:', token.slice(0, 20) + '...');

  const result = app.sessionManager('admin').validateAccessToken(token);
  console.log('validateAccessToken result:', result);
  const roles = await app.db.query('plugin::users-permissions.role').findMany();
  const authenticatedRole = roles.find((r) => r.type === 'authenticated');
  const permissions = await app.plugin('users-permissions').service('permission').findRolePermissions(authenticatedRole.id);
  console.log('permissions found:', permissions.length);
  try {
    const mapped = permissions.map((p) => app.plugin('users-permissions').service('permission').toContentAPIPermission(p));
    console.log('mapped count:', mapped.length);
    const ability = await app.contentAPI.permissions.engine.generateAbility(mapped);
    console.log('ability generated:', !!ability);
  } catch (err) {
    console.error('ERROR in ability generation:', err);
  }

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/var/www/dbarc/backend/test_inspect.js');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(testScript);
    });
  });

  const res = await runCommand(conn, 'cd /var/www/dbarc/backend && node test_inspect.js');
  console.log(res.stdout);

  conn.end();
}

main().catch(console.error);
