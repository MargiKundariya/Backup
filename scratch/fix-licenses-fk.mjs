import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k) env[k.trim()] = v.join('=').trim();
  }
});

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'licenses_owner_user_id_fkey' 
      AND table_name = 'licenses'
  ) THEN 
    ALTER TABLE public.licenses DROP CONSTRAINT licenses_owner_user_id_fkey; 
    ALTER TABLE public.licenses 
      ADD CONSTRAINT licenses_owner_user_id_fkey 
      FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL; 
  END IF; 
END $$;
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Successfully updated licenses foreign key to point to public.users');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
