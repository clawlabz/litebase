import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { query } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedQuery {
  readonly id: string;
  readonly name: string;
  readonly sql: string;
  readonly description: string | null;
  readonly created_at: string;
}

interface SaveQueryRequest {
  readonly name: string;
  readonly sql: string;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/sql/saved — List saved queries
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await query<SavedQuery>(
      `SELECT id, name, sql, description, created_at
       FROM saved_queries
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [id],
    );

    return NextResponse.json(
      { success: true, data: result.rows } satisfies ApiResponse<SavedQuery[]>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch saved queries";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/sql/saved — Save a query
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "POST")) return viewerBlockedResponse();
  try {
    const { id } = await params;
    const body = (await request.json()) as SaveQueryRequest;

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query name is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.sql || typeof body.sql !== "string" || body.sql.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "SQL query is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const result = await query<SavedQuery>(
      `INSERT INTO saved_queries (project_id, name, sql, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, sql, description, created_at`,
      [id, body.name.trim(), body.sql.trim(), body.description?.trim() ?? null],
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] } satisfies ApiResponse<SavedQuery>,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save query";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
