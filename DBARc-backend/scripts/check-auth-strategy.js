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

  const sql = `
SELECT r.id as role_id, r.name as role_name, p.action 
FROM up_permissions p 
JOIN up_permissions_role_lnk l ON l.permission_id = p.id
JOIN up_roles r ON l.role_id = r.id 
WHERE p.action LIKE '%courier%' OR p.action LIKE '%shipper%' OR p.action LIKE '%user%'
ORDER BY r.id, p.action;
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/check_perm.sql');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(sql);
    });
  });

  const res = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/check_perm.sql");
  console.log(res.stdout);

  conn.end();
}

main().catch(console.error);
