import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne, queryProjectDb } from "@/lib/db";
import { safeIdentifier, isSafeIdentifier } from "@/lib/sql-utils";
import type { ApiResponse, TableInfo, CreateTableRequest } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: resolve project db_name
// ---------------------------------------------------------------------------

async function getDbName(projectId: string): Promise<string> {
  const project = await queryOne<{ db_name: string }>(
    "SELECT db_name FROM projects WHERE id = $1",
    [projectId],
  );
  if (!project) {
    throw new Error("Project not found");
  }
  return project.db_name;
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/tables — list all tables
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const dbName = await getDbName(id);

    const result = await queryProjectDb<{
      table_name: string;
      table_schema: string;
      row_estimate: string;
      size_bytes: string;
      size_pretty: string;
    }>(
      dbName,
      `SELECT
        t.table_name,
        t.table_schema,
        COALESCE(s.n_live_tup, 0)::text AS row_estimate,
        COALESCE(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)), 0)::text AS size_bytes,
        pg_size_pretty(COALESCE(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)), 0)) AS size_pretty
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s
        ON s.schemaname = t.table_schema AND s.relname = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name`,
    );

    const tables: TableInfo[] = result.rows.map((row) => ({
      name: row.table_name,
      schema: row.table_schema,
      row_count_estimate: parseInt(row.row_estimate, 10),
      size_bytes: parseInt(row.size_bytes, 10),
      size_pretty: row.size_pretty,
    }));

    return NextResponse.json(
      { success: true, data: tables } satisfies ApiResponse<TableInfo[]>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list tables";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/tables — create a new table
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "POST")) return viewerBlockedResponse();
  try {
    const { id } = await params;
    const dbName = await getDbName(id);
    const body = (await request.json()) as CreateTableRequest;

    // Validate table name
    if (!body.name || !isSafeIdentifier(body.name)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name. Use only letters, numbers, and underscores." } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.columns || body.columns.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one column is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Validate all column names
    for (const col of body.columns) {
      if (!col.name || !isSafeIdentifier(col.name)) {
        return NextResponse.json(
          { success: false, error: `Invalid column name: "${col.name}"` } satisfies ApiResponse,
          { status: 400 },
        );
      }
    }

    // Build CREATE TABLE SQL
    const tableName = safeIdentifier(body.name);
    const columnDefs = body.columns.map((col) => {
      const parts = [safeIdentifier(col.name), col.type];
      if (col.isPrimaryKey) {
        parts.push("PRIMARY KEY");
      }
      if (!col.nullable && !col.isPrimaryKey) {
        parts.push("NOT NULL");
      }
      if (col.defaultValue) {
        parts.push(`DEFAULT ${col.defaultValue}`);
      }
      return parts.join(" ");
    });

    const sql = `CREATE TABLE ${tableName} (\n  ${columnDefs.join(",\n  ")}\n)`;
    await queryProjectDb(dbName, sql);

    return NextResponse.json(
      { success: true, data: { name: body.name } } satisfies ApiResponse<{ name: string }>,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create table";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
