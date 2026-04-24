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

const newHash = '$2b$12$CjQDytrBtmKNEnRzK1pOp.uWge7e/BNH9CKX9cXPA1DnqfBWnawle';
const email = 'admin@skinmockup.com';

async function run() {
  try {
    const res = await pool.query(
      'UPDATE public.users SET password_hash = $1 WHERE email = $2',
      [newHash, email]
    );
    console.log(`Updated ${res.rowCount} row(s)`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
