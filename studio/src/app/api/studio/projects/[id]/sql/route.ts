import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { viewerBlockedResponse } from "@/lib/demo";
import { query, queryOne, createProjectPool } from "@/lib/db";
import type { ApiResponse, Project } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SqlRequest {
  readonly sql: string;
}

interface SqlResult {
  readonly columns: string[];
  readonly rows: unknown[][];
  readonly rowCount: number;
  readonly duration_ms: number;
  readonly limited?: boolean;
}

const MAX_ROWS = 1000;

const READ_ONLY_SQL_RE = /^(SELECT|WITH|EXPLAIN)\b/i;

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/sql — Execute SQL
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = performance.now();
  const { id } = await params;

  let sqlText = "";

  try {
    const body = (await request.json()) as SqlRequest;

    if (!body.sql || typeof body.sql !== "string" || body.sql.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "SQL query is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    sqlText = body.sql.trim();

    // Viewers can only execute read-only SQL
    const role = getSessionRole(await cookies());
    if (role === "viewer" && !READ_ONLY_SQL_RE.test(sqlText)) {
      return viewerBlockedResponse();
    }

    // Look up the project to get its database name
    const project = await queryOne<Project>(
      "SELECT * FROM projects WHERE id = $1",
      [id],
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    // Execute query against the project database
    const pool = createProjectPool(project.db_name);
    try {
      const result = await pool.query(sqlText);
      const durationMs = Math.round(performance.now() - startTime);

      // Determine if it's a SELECT-like query (has fields)
      const isSelect = result.fields && result.fields.length > 0;
      const columns = isSelect
        ? result.fields.map((f) => f.name)
        : [];
      const rawRows = isSelect
        ? (result.rows as Record<string, unknown>[])
        : [];
      const limited = rawRows.length > MAX_ROWS;
      const rows: unknown[][] = rawRows
        .slice(0, MAX_ROWS)
        .map((row) => columns.map((col) => row[col]));
      const rowCount = isSelect
        ? result.rowCount ?? rows.length
        : result.rowCount ?? 0;

      // Save to query_history (best-effort)
      saveHistory(id, sqlText, durationMs, rowCount, null);

      const data: SqlResult = {
        columns,
        rows,
        rowCount,
        duration_ms: durationMs,
        ...(limited ? { limited: true } : {}),
      };

      return NextResponse.json(
        { success: true, data } satisfies ApiResponse<SqlResult>,
      );
    } finally {
      await pool.end();
    }
  } catch (error: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const message =
      error instanceof Error ? error.message : "Query execution failed";

    // Save error to history (best-effort)
    if (sqlText) {
      saveHistory(id, sqlText, durationMs, 0, message);
    }

    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 400 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: save to query_history (fire-and-forget)
// ---------------------------------------------------------------------------

function saveHistory(
  projectId: string,
  sql: string,
  durationMs: number,
  rowCount: number,
  error: string | null,
): void {
  query(
    `INSERT INTO query_history (project_id, sql, duration_ms, row_count, error)
     VALUES ($1, $2, $3, $4, $5)`,
    [projectId, sql, durationMs, rowCount, error],
  ).catch(() => {
    // Silently ignore history save failures
  });
}
