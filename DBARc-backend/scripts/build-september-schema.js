const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const rootDir = path.resolve(__dirname, '..', '..');
const juneSchemaPath = path.join(rootDir, 'DBARc_Schema_2026June2.sql');
const targetSchemaPath = path.join(rootDir, 'DBARc_chema_2026September.sql');

async function buildSchema() {
  console.log('Reading base June schema from:', juneSchemaPath);
  let sql = fs.readFileSync(juneSchemaPath, 'utf8');

  // Compute bcrypt hash for #0321Blouch
  const targetPassword = '#0321Blouch';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(targetPassword, salt);
  console.log('Generated bcrypt hash for super admin password:', passwordHash);

  // 1. Add invoices DDL if not already present
  if (!sql.includes('CREATE TABLE public.invoices (')) {
    console.log('Adding invoices table schema and relations...');
    const invoiceDDL = `
--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    document_id character varying(255),
    invoice_number character varying(255),
    invoice_date date,
    period_start date,
    period_end date,
    total_charges numeric(10,2),
    status character varying(255) DEFAULT 'Pending'::character varying,
    cod_amount numeric(10,2) DEFAULT 0,
    ibft_charges numeric(10,2) DEFAULT 100,
    net_payable numeric(10,2) DEFAULT 0,
    target_payment_amount numeric(10,2),
    included_parcel_count integer DEFAULT 0,
    excluded_parcel_count integer DEFAULT 0,
    payment_method character varying(255) DEFAULT 'Cash'::character varying,
    cheque_number character varying(255),
    bank_name character varying(255),
    account_title character varying(255),
    account_number character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

ALTER TABLE public.invoices OWNER TO postgres;

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;
ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;
ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);

CREATE TABLE public.invoices_shipper_lnk (
    id integer NOT NULL,
    invoice_id integer,
    shipper_id integer,
    invoice_ord double precision
);

ALTER TABLE public.invoices_shipper_lnk OWNER TO postgres;

CREATE SEQUENCE public.invoices_shipper_lnk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.invoices_shipper_lnk_id_seq OWNER TO postgres;
ALTER SEQUENCE public.invoices_shipper_lnk_id_seq OWNED BY public.invoices_shipper_lnk.id;
ALTER TABLE ONLY public.invoices_shipper_lnk ALTER COLUMN id SET DEFAULT nextval('public.invoices_shipper_lnk_id_seq'::regclass);
`;
    // Insert before the primary keys section
    const pkMarker = '-- Name: admin_permissions admin_permissions_pkey';
    if (sql.includes(pkMarker)) {
      sql = sql.replace(pkMarker, invoiceDDL + '\n\n' + pkMarker);
    } else {
      sql += '\n\n' + invoiceDDL;
    }

    const pkConstraints = `
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices_shipper_lnk ADD CONSTRAINT invoices_shipper_lnk_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX invoices_unique_invoice_number ON public.invoices USING btree (invoice_number);
`;
    sql += '\n\n' + pkConstraints;
  }

  // Helper to replace data inside COPY public.table (...) FROM stdin; ... \.
  function replaceCopyData(tableName, newRows) {
    const startMarker = `COPY public.${tableName} `;
    const startIdx = sql.indexOf(startMarker);
    if (startIdx === -1) {
      console.warn(`Table ${tableName} not found in dump!`);
      return;
    }
    const stdinMarker = 'FROM stdin;';
    const stdinIdx = sql.indexOf(stdinMarker, startIdx);
    const endMarker = '\\.';
    const endIdx = sql.indexOf(endMarker, stdinIdx);

    const before = sql.substring(0, stdinIdx + stdinMarker.length);
    const after = sql.substring(endIdx);
    sql = before + '\n' + newRows.trim() + '\n' + after;
    console.log(`Replaced COPY data for ${tableName}`);
  }

  // 2. Set Super Admin in admin_users with password #0321Blouch
  const adminUserRow = `1\ta1p0xgn1j7elcux91hkynoe0\tNaeem\tKhan\tnaeem4it\tnaeem4it@gmail.com\t${passwordHash}\t\\N\t\\N\tt\tf\t\\N\t2026-05-05 20:07:22.122\t2026-09-25 21:00:00.000\t2026-05-05 20:07:22.123\t\\N\t\\N\t\\N`;
  replaceCopyData('admin_users', adminUserRow);

  // Link to Super Admin role
  const adminRoleLnkRow = `1\t1\t1\t1\t1`;
  replaceCopyData('admin_users_roles_lnk', adminRoleLnkRow);

  // Set up_users entry
  const upUserRow = `1\tup_user_superadmin_naeem\tSuper Admin\t2026-05-05 20:06:17.987\t2026-09-25 21:00:00.000\t2026-05-05 20:06:17.987\t\\N\t\\N\t\\N`;
  replaceCopyData('up_users', upUserRow);

  // Ensure sequence numbers are properly set
  if (sql.includes("SELECT pg_catalog.setval('public.admin_users_id_seq'")) {
    sql = sql.replace(/SELECT pg_catalog\.setval\('public\.admin_users_id_seq',\s*\d+,\s*(true|false)\);/, "SELECT pg_catalog.setval('public.admin_users_id_seq', 1, true);");
  }

  fs.writeFileSync(targetSchemaPath, sql, 'utf8');
  console.log(`Successfully generated: ${targetSchemaPath} (${(fs.statSync(targetSchemaPath).size / 1024).toFixed(1)} KB)`);
}

buildSchema().catch(err => {
  console.error('Error generating schema:', err);
  process.exit(1);
});
