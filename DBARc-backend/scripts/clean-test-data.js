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

  const cleanupSql = `
DELETE FROM up_users WHERE id > 1;
DELETE FROM tenants WHERE id > 1;
DELETE FROM role_definitions WHERE tenant_id > 1;
DELETE FROM regions WHERE tenant_id > 1;

DO $$
DECLARE
    rec RECORD;
    max_val BIGINT;
BEGIN
    FOR rec IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            cc.column_name,
            pg_get_serial_sequence('"' || tc.table_schema || '"."' || tc.table_name || '"', cc.column_name) AS seq_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage cc 
            ON tc.constraint_name = cc.constraint_name 
            AND tc.table_schema = cc.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_schema = 'public'
    LOOP
        IF rec.seq_name IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I.%I', rec.column_name, rec.table_schema, rec.table_name) INTO max_val;
            IF max_val > 0 THEN
                EXECUTE format('SELECT setval(%L, %s, true)', rec.seq_name, max_val);
            ELSE
                EXECUTE format('SELECT setval(%L, 1, false)', rec.seq_name);
            END IF;
        END IF;
    END LOOP;
END $$;
`;

  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/cleanup_test_data.sql');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(cleanupSql);
    });
  });

  const res = await runCommand(conn, "echo 'Password123!' | sudo -S -u postgres psql -d dbarc_db -f /tmp/cleanup_test_data.sql");
  console.log(res.stdout);

  conn.end();
}

main().catch(console.error);
