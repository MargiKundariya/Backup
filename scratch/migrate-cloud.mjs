import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...value] = line.split('=');
      return [key.trim(), value.join('=').trim()];
    })
);

const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting migrations to cloud database...');

    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        id          TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, '..', 'infra', 'volumes', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationId = file;
      
      // Skip storage migrations that require superuser/owner permissions on Supabase
      if (migrationId === '002_storage_buckets.sql') {
        console.log(`- Skipping ${migrationId} (Requires manual setup in Supabase Dashboard)`);
        continue;
      }
      
      const { rows } = await client.query(
        'SELECT 1 FROM public.schema_migrations WHERE id = $1',
        [migrationId]
      );

      if (rows.length > 0) {
        console.log(`- Skipping ${migrationId} (already applied)`);
        continue;
      }

      console.log(`+ Applying ${migrationId}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      // Execute as one block
      await client.query(sql);

      await client.query(
        'INSERT INTO public.schema_migrations (id) VALUES ($1)',
        [migrationId]
      );
      console.log(`  ✅ Done`);
    }

    console.log('🎉 Migrations complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
