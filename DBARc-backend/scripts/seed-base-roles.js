const { Client } = require('ssh2');
const crypto = require('crypto');

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

  const roles = [
    {
      name: 'Super Admin',
      perms: ['manage_finance', 'view_shipments', 'create_shipment', 'manage_riders']
    },
    {
      name: 'Admin',
      perms: ['manage_finance', 'view_shipments', 'create_shipment', 'manage_riders']
    },
    {
      name: 'Front desk',
      perms: ['view_shipments', 'create_shipment']
    },
    {
      name: 'shipment Booker',
      perms: ['view_shipments', 'create_shipment']
    },
    {
      name: 'Rider',
      perms: ['view_shipments']
    }
  ];

  let sql = '';
  for (const r of roles) {
    const docId = crypto.randomBytes(12).toString('hex');
    const permsJson = JSON.stringify(r.perms);
    sql += `
INSERT INTO public.role_definitions (document_id, role_name, permissions, created_at, updated_at, published_at)
SELECT '${docId}', '${r.name}', '${permsJson}'::jsonb, NOW(), NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_definitions WHERE role_name = '${r.name}'
);
`;
  }

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/seed_roles.sql');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(sql);
    });
  });

  console.log('Seeding standard Courier Role Definitions in dbarc_db...');
  const res = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/seed_roles.sql");
  console.log(res.stdout);

  const listRes = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -c 'SELECT id, role_name, permissions FROM role_definitions;'");
  console.log('Seeded Role Definitions:\n', listRes.stdout);

  conn.end();
}

main().catch(console.error);
