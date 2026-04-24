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
BEGIN;

-- 1. Drop old constraint if it exists (it might point to auth.users)
ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_owner_user_id_fkey;

-- 2. Create new constraint pointing to public.users
ALTER TABLE public.licenses 
  ADD CONSTRAINT licenses_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Update view to include owner details and dates
DROP VIEW IF EXISTS public.license_seat_usage CASCADE;
CREATE OR REPLACE VIEW public.license_seat_usage AS
SELECT
  l.id,
  l.key,
  l.tier,
  l.max_seats,
  l.status,
  l.expires_at,
  l.created_at,
  l.owner_user_id,
  u.full_name as owner_name,
  u.email as owner_email,
  COUNT(a.id) FILTER (WHERE a.deactivated_at IS NULL) AS active_seats,
  l.max_seats - COUNT(a.id) FILTER (WHERE a.deactivated_at IS NULL) AS seats_remaining
FROM public.licenses l
LEFT JOIN public.license_activations a ON a.license_id = l.id
LEFT JOIN public.users u ON u.id = l.owner_user_id
GROUP BY l.id, u.id;

COMMIT;
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Successfully applied permanent DB fix for licenses and updated the view.');
    process.exit(0);
  } catch (err) {
    console.error('FAILED to apply DB fix:', err);
    await pool.query('ROLLBACK').catch(() => {});
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
