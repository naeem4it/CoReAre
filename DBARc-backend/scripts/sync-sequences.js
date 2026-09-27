const { Client } = require('pg');

async function syncSequences(clientConfig) {
  const client = new Client(clientConfig);
  await client.connect();
  console.log(`Connected to ${clientConfig.database} at ${clientConfig.host}...`);

  const sql = `
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

  await client.query(sql);
  console.log('All primary key sequences synchronized to max(id)!');

  // Verify key sequences
  const seqs = ['up_users_id_seq', 'tenants_id_seq', 'role_definitions_id_seq', 'offices_id_seq'];
  for (const s of seqs) {
    try {
      const res = await client.query(`SELECT last_value, is_called FROM ${s}`);
      console.log(`Sequence ${s}:`, res.rows[0]);
    } catch (e) {
      console.log(`Sequence ${s}: not found`);
    }
  }

  await client.end();
}

async function main() {
  const localConfig = {
    host: '127.0.0.1',
    port: 5432,
    database: 'dbarc_db',
    user: 'postgres',
    password: 'root',
  };

  console.log('--- SYNCING LOCAL DATABASE ---');
  await syncSequences(localConfig);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncSequences };
