import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne, queryProjectDb } from "@/lib/db";
import { isSafeIdentifier, safeIdentifier } from "@/lib/sql-utils";
import type { ApiResponse, TableSchema, ColumnInfo, IndexInfo } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper
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
// GET /api/studio/projects/[id]/tables/[tableName] — table schema
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> },
) {
  try {
    const { id, tableName } = await params;

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const dbName = await getDbName(id);

    // Columns with primary key + foreign key info
    const colResult = await queryProjectDb<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
      is_pk: boolean;
      fk_ref: string | null;
    }>(
      dbName,
      `SELECT
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        COALESCE(pk.is_pk, false) AS is_pk,
        fk.fk_ref
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT
          kcu.column_name,
          true AS is_pk
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON pk.column_name = c.column_name
      LEFT JOIN (
        SELECT
          kcu.column_name,
          ccu.table_name || '.' || ccu.column_name AS fk_ref
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON fk.column_name = c.column_name
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position`,
      [tableName],
    );

    const columns: ColumnInfo[] = colResult.rows.map((row) => ({
      name: row.column_name,
      type: row.udt_name,
      nullable: row.is_nullable === "YES",
      default_value: row.column_default,
      is_primary_key: row.is_pk,
      foreign_key_ref: row.fk_ref,
    }));

    // Indexes
    const idxResult = await queryProjectDb<{
      index_name: string;
      column_names: string;
      is_unique: boolean;
      is_primary: boolean;
    }>(
      dbName,
      `SELECT
        i.relname AS index_name,
        string_agg(a.attname, ',' ORDER BY array_position(ix.indkey, a.attnum)) AS column_names,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = 'public' AND t.relname = $1
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
      ORDER BY i.relname`,
      [tableName],
    );

    const indexes: IndexInfo[] = idxResult.rows.map((row) => ({
      name: row.index_name,
      columns: row.column_names.split(","),
      is_unique: row.is_unique,
      is_primary: row.is_primary,
    }));

    const schema: TableSchema = { columns, indexes };

    return NextResponse.json(
      { success: true, data: schema } satisfies ApiResponse<TableSchema>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get table schema";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/studio/projects/[id]/tables/[tableName] — drop table
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "DELETE")) return viewerBlockedResponse();
  try {
    const { id, tableName } = await params;

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const dbName = await getDbName(id);
    await queryProjectDb(dbName, `DROP TABLE IF EXISTS ${safeIdentifier(tableName)}`);

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to drop table";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
