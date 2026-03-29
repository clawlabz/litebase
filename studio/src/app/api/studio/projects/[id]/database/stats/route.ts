import { NextResponse } from "next/server";
import { queryOne, queryProjectDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableStat {
  readonly name: string;
  readonly row_count: number;
  readonly total_size: string;
  readonly index_size: string;
  readonly total_bytes: number;
  readonly index_bytes: number;
}

interface ExtensionInfo {
  readonly name: string;
  readonly version: string;
  readonly comment: string | null;
}

interface DatabaseStats {
  readonly total_size: string;
  readonly total_size_bytes: number;
  readonly tables: readonly TableStat[];
  readonly active_connections: number;
  readonly extensions: readonly ExtensionInfo[];
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/database/stats
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await queryOne<{ database_name: string }>(
      "SELECT database_name FROM projects WHERE id = $1",
      [id],
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const dbName = project.database_name;

    // Total database size
    const sizeResult = await queryProjectDb<{
      size_pretty: string;
      size_bytes: string;
    }>(
      dbName,
      `SELECT
        pg_size_pretty(pg_database_size(current_database())) AS size_pretty,
        pg_database_size(current_database())::text AS size_bytes`,
    );

    const totalSize = sizeResult.rows[0]?.size_pretty ?? "0 bytes";
    const totalSizeBytes = parseInt(sizeResult.rows[0]?.size_bytes ?? "0", 10);

    // Per-table stats
    const tablesResult = await queryProjectDb<{
      table_name: string;
      row_estimate: string;
      total_bytes: string;
      index_bytes: string;
      total_size: string;
      index_size: string;
    }>(
      dbName,
      `SELECT
        s.relname AS table_name,
        COALESCE(s.n_live_tup, 0)::text AS row_estimate,
        COALESCE(pg_total_relation_size(quote_ident(s.schemaname) || '.' || quote_ident(s.relname)), 0)::text AS total_bytes,
        COALESCE(pg_indexes_size(quote_ident(s.schemaname) || '.' || quote_ident(s.relname)), 0)::text AS index_bytes,
        pg_size_pretty(COALESCE(pg_total_relation_size(quote_ident(s.schemaname) || '.' || quote_ident(s.relname)), 0)) AS total_size,
        pg_size_pretty(COALESCE(pg_indexes_size(quote_ident(s.schemaname) || '.' || quote_ident(s.relname)), 0)) AS index_size
       FROM pg_stat_user_tables s
       WHERE s.schemaname = 'public'
       ORDER BY pg_total_relation_size(quote_ident(s.schemaname) || '.' || quote_ident(s.relname)) DESC`,
    );

    const tables: TableStat[] = tablesResult.rows.map((r) => ({
      name: r.table_name,
      row_count: parseInt(r.row_estimate, 10),
      total_size: r.total_size,
      index_size: r.index_size,
      total_bytes: parseInt(r.total_bytes, 10),
      index_bytes: parseInt(r.index_bytes, 10),
    }));

    // Active connections
    const connResult = await queryProjectDb<{ cnt: string }>(
      dbName,
      `SELECT count(*)::text AS cnt
       FROM pg_stat_activity
       WHERE datname = current_database()`,
    );
    const activeConnections = parseInt(connResult.rows[0]?.cnt ?? "0", 10);

    // Installed extensions
    const extResult = await queryProjectDb<{
      name: string;
      installed_version: string;
      comment: string | null;
    }>(
      dbName,
      `SELECT name, installed_version, comment
       FROM pg_available_extensions
       WHERE installed_version IS NOT NULL
       ORDER BY name`,
    );

    const extensions: ExtensionInfo[] = extResult.rows.map((r) => ({
      name: r.name,
      version: r.installed_version,
      comment: r.comment,
    }));

    const stats: DatabaseStats = {
      total_size: totalSize,
      total_size_bytes: totalSizeBytes,
      tables,
      active_connections: activeConnections,
      extensions,
    };

    return NextResponse.json(
      { success: true, data: stats } satisfies ApiResponse<DatabaseStats>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get database stats";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
