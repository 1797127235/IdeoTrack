import pg from 'pg';
import { config } from '../config/index.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // 生产环境建议根据负载调整；V1 保持默认即可
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export interface QueryRow {
  [key: string]: unknown;
}

export async function query<T = QueryRow>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = QueryRow>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function queryCount(sql: string, params?: unknown[]): Promise<number> {
  const row = await queryOne<{ count: string }>(sql, params);
  return row ? parseInt(row.count, 10) : 0;
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
