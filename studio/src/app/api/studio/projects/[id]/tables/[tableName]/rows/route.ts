import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne, queryProjectDb } from "@/lib/db";
import { isSafeIdentifier, safeIdentifier } from "@/lib/sql-utils";
import type { ApiResponse, PaginatedRows } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getDbName(projectId: string): Promise<string> {
  const project = await queryOne<{ database_name: string }>(
    "SELECT database_name FROM projects WHERE id = $1",
    [projectId],
  );
  if (!project) {
    throw new Error("Project not found");
  }
  return project.database_name;
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/tables/[tableName]/rows
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)));
    const sort = url.searchParams.get("sort");
    const order = url.searchParams.get("order") === "desc" ? "DESC" : "ASC";
    const offset = (page - 1) * pageSize;

    const safeTable = safeIdentifier(tableName);

    // Build ORDER BY clause
    let orderBy = "";
    if (sort && isSafeIdentifier(sort)) {
      orderBy = `ORDER BY ${safeIdentifier(sort)} ${order}`;
    }

    const result = await queryProjectDb<Record<string, unknown> & { _total_count: string }>(
      dbName,
      `SELECT *, COUNT(*) OVER() AS _total_count
       FROM ${safeTable}
       ${orderBy}
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );

    const totalCount = result.rows.length > 0
      ? parseInt(String(result.rows[0]._total_count), 10)
      : 0;

    // Strip the _total_count from each row
    const rows = result.rows.map((row) => {
      const { _total_count, ...rest } = row;
      return rest;
    });

    const data: PaginatedRows = {
      rows,
      totalCount,
      page,
      pageSize,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<PaginatedRows>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch rows";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/tables/[tableName]/rows — insert row
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "POST")) return viewerBlockedResponse();
  try {
    const { id, tableName } = await params;

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const dbName = await getDbName(id);
    const body = (await request.json()) as { data: Record<string, unknown> };

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing data object" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const entries = Object.entries(body.data).filter(([key]) => isSafeIdentifier(key));

    if (entries.length === 0) {
      // Insert with defaults only
      const result = await queryProjectDb(
        dbName,
        `INSERT INTO ${safeIdentifier(tableName)} DEFAULT VALUES RETURNING *`,
      );
      return NextResponse.json(
        { success: true, data: result.rows[0] } satisfies ApiResponse,
        { status: 201 },
      );
    }

    const columns = entries.map(([key]) => safeIdentifier(key)).join(", ");
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
    const values = entries.map(([, val]) => val);

    const result = await queryProjectDb(
      dbName,
      `INSERT INTO ${safeIdentifier(tableName)} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] } satisfies ApiResponse,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to insert row";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/studio/projects/[id]/tables/[tableName]/rows — update row
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> },
) {
  const role2 = getSessionRole(await cookies());
  if (isViewerBlocked(role2, "PATCH")) return viewerBlockedResponse();
  try {
    const { id, tableName } = await params;

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const dbName = await getDbName(id);
    const body = (await request.json()) as {
      primaryKey: { column: string; value: unknown };
      data: Record<string, unknown>;
    };

    if (!body.primaryKey || !isSafeIdentifier(body.primaryKey.column)) {
      return NextResponse.json(
        { success: false, error: "Invalid primary key" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing data object" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const entries = Object.entries(body.data).filter(([key]) => isSafeIdentifier(key));

    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid columns to update" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const setClauses = entries.map(([key], i) => `${safeIdentifier(key)} = $${i + 1}`);
    const values = [...entries.map(([, val]) => val), body.primaryKey.value];
    const pkParam = `$${values.length}`;

    const result = await queryProjectDb(
      dbName,
      `UPDATE ${safeIdentifier(tableName)}
       SET ${setClauses.join(", ")}
       WHERE ${safeIdentifier(body.primaryKey.column)} = ${pkParam}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Row not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: result.rows[0] } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update row";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/studio/projects/[id]/tables/[tableName]/rows — delete rows
// ---------------------------------------------------------------------------

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> },
) {
  const role3 = getSessionRole(await cookies());
  if (isViewerBlocked(role3, "DELETE")) return viewerBlockedResponse();
  try {
    const { id, tableName } = await params;

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const dbName = await getDbName(id);
    const body = (await request.json()) as {
      primaryKey: ReadonlyArray<{ column: string; value: unknown }>;
    };

    if (!Array.isArray(body.primaryKey) || body.primaryKey.length === 0) {
      return NextResponse.json(
        { success: false, error: "No rows specified for deletion" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // All PKs must use the same column
    const pkColumn = body.primaryKey[0].column;
    if (!isSafeIdentifier(pkColumn)) {
      return NextResponse.json(
        { success: false, error: "Invalid primary key column" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const values = body.primaryKey.map((pk) => pk.value);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    const result = await queryProjectDb(
      dbName,
      `DELETE FROM ${safeIdentifier(tableName)}
       WHERE ${safeIdentifier(pkColumn)} IN (${placeholders})`,
      values,
    );

    return NextResponse.json(
      { success: true, data: { deletedCount: result.rowCount ?? 0 } } satisfies ApiResponse<{ deletedCount: number }>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete rows";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
