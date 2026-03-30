import { NextResponse } from "next/server";
import { queryOne, queryProjectDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiDocsColumn {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly default_value: string | null;
  readonly is_primary: boolean;
}

interface ApiDocsTable {
  readonly name: string;
  readonly columns: readonly ApiDocsColumn[];
  readonly description: string | null;
}

interface ApiDocsPayload {
  readonly tables: readonly ApiDocsTable[];
  readonly api_url: string;
  readonly anon_key: string;
  readonly service_role_key: string;
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/api-docs
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await queryOne<{
      database_name: string;
      anon_key: string;
      service_role_key: string;
      postgrest_port: number;
      postgrest_url: string | null;
    }>(
      "SELECT database_name, anon_key, service_role_key, postgrest_port, postgrest_url FROM projects WHERE id = $1",
      [id],
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    // Fetch all public tables
    const tablesResult = await queryProjectDb<{
      table_name: string;
    }>(
      project.database_name,
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );

    // Fetch columns for all public tables
    const columnsResult = await queryProjectDb<{
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      project.database_name,
      `SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default
       FROM information_schema.columns c
       WHERE c.table_schema = 'public'
       ORDER BY c.table_name, c.ordinal_position`,
    );

    // Fetch primary keys
    const pkResult = await queryProjectDb<{
      table_name: string;
      column_name: string;
    }>(
      project.database_name,
      `SELECT
        kcu.table_name,
        kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = 'public'`,
    );

    // Fetch table descriptions
    const descResult = await queryProjectDb<{
      table_name: string;
      description: string;
    }>(
      project.database_name,
      `SELECT
        c.relname AS table_name,
        obj_description(c.oid) AS description
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
         AND obj_description(c.oid) IS NOT NULL`,
    );

    const pkSet = new Set(
      pkResult.rows.map((r) => `${r.table_name}.${r.column_name}`),
    );
    const descMap = new Map(
      descResult.rows.map((r) => [r.table_name, r.description]),
    );

    // Group columns by table
    const columnsMap = new Map<string, ApiDocsColumn[]>();
    for (const col of columnsResult.rows) {
      const arr = columnsMap.get(col.table_name) ?? [];
      arr.push({
        name: col.column_name,
        type: col.udt_name || col.data_type,
        nullable: col.is_nullable === "YES",
        default_value: col.column_default,
        is_primary: pkSet.has(`${col.table_name}.${col.column_name}`),
      });
      columnsMap.set(col.table_name, arr);
    }

    const tables: ApiDocsTable[] = tablesResult.rows.map((t) => ({
      name: t.table_name,
      columns: columnsMap.get(t.table_name) ?? [],
      description: descMap.get(t.table_name) ?? null,
    }));

    const apiUrl = project.postgrest_url ?? `http://localhost:${project.postgrest_port}`;

    const payload: ApiDocsPayload = {
      tables,
      api_url: apiUrl,
      anon_key: project.anon_key,
      service_role_key: project.service_role_key,
    };

    return NextResponse.json(
      { success: true, data: payload } satisfies ApiResponse<ApiDocsPayload>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate API docs";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
