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

  console.log('Connected to SSH.');

  const sql = `
DO $$
DECLARE
    tbl text;
    seq text;
    vw text;
BEGIN
    FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO dbarc_user;', tbl);
    END LOOP;
    FOR seq IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO dbarc_user;', seq);
    END LOOP;
    FOR vw IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER VIEW public.%I OWNER TO dbarc_user;', vw);
    END LOOP;
END $$;
GRANT ALL PRIVILEGES ON SCHEMA public TO dbarc_user;
ALTER SCHEMA public OWNER TO dbarc_user;
`;

  console.log('Writing /tmp/fix_owner.sql on remote server...');
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/fix_owner.sql');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(sql);
    });
  });

  console.log('Executing fix_owner.sql on dbarc_db...');
  const res = await runCommand(conn, 'sudo -S -u postgres psql -d dbarc_db -f /tmp/fix_owner.sql');
  console.log('psql result:', res.stdout);

  console.log('Restarting dbarc-backend via PM2...');
  const restartRes = await runCommand(conn, 'pm2 restart dbarc-backend');
  console.log(restartRes.stdout);

  console.log('Waiting 10s for Strapi to boot...');
  await new Promise(r => setTimeout(r, 10000));

  const logRes = await runCommand(conn, 'pm2 logs dbarc-backend --lines 30 --nostream');
  console.log('Backend logs:\n', logRes.stdout);

  const curlRes = await runCommand(conn, 'curl -I http://127.0.0.1:1337');
  console.log('Curl 1337 response:\n', curlRes.stdout);

  conn.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
