import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/sql/history
// ---------------------------------------------------------------------------

export interface QueryHistoryRow {
  readonly id: string;
  readonly sql: string;
  readonly duration_ms: number;
  readonly row_count: number;
  readonly error: string | null;
  readonly created_at: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await query<QueryHistoryRow>(
      `SELECT id, sql, duration_ms, row_count, error, created_at
       FROM query_history
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id],
    );

    return NextResponse.json(
      { success: true, data: result.rows } satisfies ApiResponse<QueryHistoryRow[]>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
