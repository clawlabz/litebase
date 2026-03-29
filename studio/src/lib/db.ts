import { Pool, type PoolClient, type QueryResult } from "pg";

// ---------------------------------------------------------------------------
// Meta database pool (litebase_meta) -- shared across all API routes
// ---------------------------------------------------------------------------

const metaPool = new Pool({
  host: process.env.PG_HOST ?? "localhost",
  port: Number(process.env.PG_PORT ?? 5432),
  user: process.env.PG_USER ?? "postgres",
  password: process.env.PG_PASSWORD ?? "postgres",
  database: process.env.POSTGRES_DB ?? "litebase_meta",
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export interface QueryParams {
  readonly text: string;
  readonly values?: readonly unknown[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T extends Record<string, any> = Record<string, unknown>>(
  sql: string,
  values?: readonly unknown[],
): Promise<QueryResult<T>> {
  try {
    return await metaPool.query<T>(sql, values as unknown[]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Meta DB query failed: ${message}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T extends Record<string, any> = Record<string, unknown>>(
  sql: string,
  values?: readonly unknown[],
): Promise<T | null> {
  const result = await query<T>(sql, values);
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Connect to a *specific* project database (for admin operations)
// ---------------------------------------------------------------------------

export function createProjectPool(dbName: string): Pool {
  return new Pool({
    host: process.env.PG_HOST ?? "localhost",
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? "postgres",
    password: process.env.PG_PASSWORD ?? "postgres",
    database: dbName,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryProjectDb<T extends Record<string, any> = Record<string, unknown>>(
  dbName: string,
  sql: string,
  values?: readonly unknown[],
): Promise<QueryResult<T>> {
  const pool = createProjectPool(dbName);
  try {
    return await pool.query<T>(sql, values as unknown[]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    throw new Error(`Project DB (${dbName}) query failed: ${message}`);
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Transaction helper
// ---------------------------------------------------------------------------

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await metaPool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { metaPool };
