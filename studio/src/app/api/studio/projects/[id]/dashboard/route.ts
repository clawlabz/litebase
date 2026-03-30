import { NextResponse } from "next/server";
import { queryOne, queryProjectDb, createProjectPool } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceHealth {
  readonly status: "online" | "offline" | "not_configured";
  readonly latency_ms: number;
}

interface TableStat {
  readonly name: string;
  readonly row_count: number;
  readonly size_bytes: number;
}

interface DatabaseStats {
  readonly size_bytes: number;
  readonly table_count: number;
  readonly total_rows: number;
  readonly active_connections: number;
  readonly tables: readonly TableStat[];
}

interface AuthStats {
  readonly total_users: number;
  readonly confirmed_users: number;
  readonly users_last_24h: number;
  readonly users_last_7d: number;
  readonly recent_signups: readonly { email: string; created_at: string }[];
}

interface ActivityEvent {
  readonly action: string;
  readonly actor_email: string;
  readonly created_at: string;
}

interface ActivityStats {
  readonly events_last_24h: number;
  readonly events_last_7d: number;
  readonly recent_events: readonly ActivityEvent[];
}

interface DashboardData {
  readonly services: {
    readonly database: ServiceHealth;
    readonly auth: ServiceHealth;
    readonly api: ServiceHealth;
  };
  readonly database: DatabaseStats;
  readonly auth: AuthStats;
  readonly activity: ActivityStats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function pingService(url: string): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: "online", latency_ms: latency };
    }
    return { status: "offline", latency_ms: latency };
  } catch {
    return { status: "offline", latency_ms: Date.now() - start };
  }
}

async function getDatabaseHealth(dbName: string): Promise<ServiceHealth> {
  const start = Date.now();
  const pool = createProjectPool(dbName);
  try {
    await pool.query("SELECT 1");
    return { status: "online", latency_ms: Date.now() - start };
  } catch {
    return { status: "offline", latency_ms: Date.now() - start };
  } finally {
    await pool.end();
  }
}

async function getDatabaseStats(dbName: string): Promise<DatabaseStats> {
  const sizeResult = await queryProjectDb<{ size_bytes: string }>(
    dbName,
    "SELECT pg_database_size(current_database())::text AS size_bytes",
  );
  const sizeBytes = parseInt(sizeResult.rows[0]?.size_bytes ?? "0", 10);

  const tablesResult = await queryProjectDb<{
    table_name: string;
    row_estimate: string;
    total_bytes: string;
  }>(
    dbName,
    `SELECT
      s.relname AS table_name,
      COALESCE(s.n_live_tup, 0)::text AS row_estimate,
      COALESCE(pg_total_relation_size(
        quote_ident(s.schemaname) || '.' || quote_ident(s.relname)
      ), 0)::text AS total_bytes
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
    ORDER BY pg_total_relation_size(
      quote_ident(s.schemaname) || '.' || quote_ident(s.relname)
    ) DESC`,
  );

  const tables: TableStat[] = tablesResult.rows.map((r) => ({
    name: r.table_name,
    row_count: parseInt(r.row_estimate, 10),
    size_bytes: parseInt(r.total_bytes, 10),
  }));

  const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0);

  const connResult = await queryProjectDb<{ cnt: string }>(
    dbName,
    "SELECT count(*)::text AS cnt FROM pg_stat_activity WHERE datname = current_database()",
  );
  const activeConnections = parseInt(connResult.rows[0]?.cnt ?? "0", 10);

  return {
    size_bytes: sizeBytes,
    table_count: tables.length,
    total_rows: totalRows,
    active_connections: activeConnections,
    tables,
  };
}

async function getAuthStats(dbName: string): Promise<AuthStats> {
  try {
    const totalResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      "SELECT COUNT(*)::text AS cnt FROM auth.users",
    );
    const totalUsers = parseInt(totalResult.rows[0]?.cnt ?? "0", 10);

    const confirmedResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      "SELECT COUNT(*)::text AS cnt FROM auth.users WHERE email_confirmed_at IS NOT NULL",
    );
    const confirmedUsers = parseInt(confirmedResult.rows[0]?.cnt ?? "0", 10);

    const last24hResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      "SELECT COUNT(*)::text AS cnt FROM auth.users WHERE created_at >= now() - interval '24 hours'",
    );
    const usersLast24h = parseInt(last24hResult.rows[0]?.cnt ?? "0", 10);

    const last7dResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      "SELECT COUNT(*)::text AS cnt FROM auth.users WHERE created_at >= now() - interval '7 days'",
    );
    const usersLast7d = parseInt(last7dResult.rows[0]?.cnt ?? "0", 10);

    const recentResult = await queryProjectDb<{
      email: string;
      created_at: string;
    }>(
      dbName,
      "SELECT email, created_at::text FROM auth.users ORDER BY created_at DESC LIMIT 5",
    );

    return {
      total_users: totalUsers,
      confirmed_users: confirmedUsers,
      users_last_24h: usersLast24h,
      users_last_7d: usersLast7d,
      recent_signups: recentResult.rows.map((r) => ({
        email: r.email ?? "unknown",
        created_at: r.created_at,
      })),
    };
  } catch {
    // auth schema might not exist
    return {
      total_users: 0,
      confirmed_users: 0,
      users_last_24h: 0,
      users_last_7d: 0,
      recent_signups: [],
    };
  }
}

async function getActivityStats(dbName: string): Promise<ActivityStats> {
  try {
    // Try auth.audit_log_entries first
    const last24hResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      "SELECT COUNT(*)::text AS cnt FROM auth.audit_log_entries WHERE created_at >= now() - interval '24 hours'",
    );
    const eventsLast24h = parseInt(last24hResult.rows[0]?.cnt ?? "0", 10);

    const last7dResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      "SELECT COUNT(*)::text AS cnt FROM auth.audit_log_entries WHERE created_at >= now() - interval '7 days'",
    );
    const eventsLast7d = parseInt(last7dResult.rows[0]?.cnt ?? "0", 10);

    const recentResult = await queryProjectDb<{
      action: string;
      actor_email: string;
      created_at: string;
    }>(
      dbName,
      `SELECT
        COALESCE(payload->>'action', 'unknown') AS action,
        COALESCE(payload->'actor'->>'email', payload->>'email', 'system') AS actor_email,
        created_at::text
      FROM auth.audit_log_entries
      ORDER BY created_at DESC
      LIMIT 10`,
    );

    return {
      events_last_24h: eventsLast24h,
      events_last_7d: eventsLast7d,
      recent_events: recentResult.rows.map((r) => ({
        action: r.action,
        actor_email: r.actor_email,
        created_at: r.created_at,
      })),
    };
  } catch {
    // audit_log_entries might not exist
    return {
      events_last_24h: 0,
      events_last_7d: 0,
      recent_events: [],
    };
  }
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/dashboard
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await queryOne<{
      database_name: string;
      gotrue_port: number;
      postgrest_port: number;
      gotrue_container_id: string | null;
      postgrest_container_id: string | null;
    }>(
      "SELECT database_name, gotrue_port, postgrest_port, gotrue_container_id, postgrest_container_id FROM projects WHERE id = $1",
      [id],
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const dbName = project.database_name;

    // Fetch all data in parallel
    const [dbHealth, authHealth, apiHealth, dbStats, authStats, activityStats] =
      await Promise.all([
        getDatabaseHealth(dbName),
        project.gotrue_container_id
          ? pingService(`http://localhost:${project.gotrue_port}/health`)
          : Promise.resolve({
              status: "not_configured" as const,
              latency_ms: 0,
            }),
        project.postgrest_container_id
          ? pingService(`http://localhost:${project.postgrest_port}/`)
          : Promise.resolve({
              status: "not_configured" as const,
              latency_ms: 0,
            }),
        getDatabaseStats(dbName),
        getAuthStats(dbName),
        getActivityStats(dbName),
      ]);

    const data: DashboardData = {
      services: {
        database: dbHealth,
        auth: authHealth,
        api: apiHealth,
      },
      database: dbStats,
      auth: authStats,
      activity: activityStats,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<DashboardData>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch dashboard data";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
