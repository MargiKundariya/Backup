/**
 * PostgreSQL connection pool.
 * Used by all server-side API routes — never import this in client components.
 *
 * Env vars required in .env.local:
 *   PG_HOST      localhost
 *   PG_PORT      5432
 *   PG_DATABASE  postgres
 *   PG_USER      postgres
 *   PG_PASSWORD  <from infra/.env POSTGRES_PASSWORD>
 */

import { Pool, PoolClient } from 'pg';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Required for many cloud providers
      }
    : {
        host: process.env.PG_HOST ?? 'localhost',
        port: Number(process.env.PG_PORT ?? 5432),
        database: process.env.PG_DATABASE ?? 'postgres',
        user: process.env.PG_USER ?? 'postgres',
        password: process.env.PG_PASSWORD,
      }
);

if (pool.options) {
  (pool.options as any).max = 10;
  (pool.options as any).idleTimeoutMillis = 30000;
  (pool.options as any).connectionTimeoutMillis = 5000;
}

pool.on('error', (err) => {
  console.error('[postgres] Unexpected pool error', err);
});

/** Run a single query with automatic connection release. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

/** Run a single query and return the first row (throws if not found). */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const rows = await query<T>(sql, params);
  if (rows.length === 0) throw new Error('Row not found');
  return rows[0];
}

/** Run a single query and return the first row or null. */
export async function queryMaybe<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run multiple queries in a single transaction. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
