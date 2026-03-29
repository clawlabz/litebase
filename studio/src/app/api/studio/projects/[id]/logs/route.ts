import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { logEvent } from "@/lib/logger";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  readonly id: string;
  readonly level: string;
  readonly category: string;
  readonly message: string;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
}

interface LogsResponse {
  readonly logs: readonly LogEntry[];
  readonly totalCount: number;
}

interface CreateLogRequest {
  readonly level: string;
  readonly category: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_LEVELS = new Set(["debug", "info", "warn", "error"]);
const VALID_CATEGORIES = new Set(["auth", "api", "system"]);

function validateLevel(level: string): boolean {
  return VALID_LEVELS.has(level);
}

function validateCategory(category: string): boolean {
  return VALID_CATEGORIES.has(category);
}

// ---------------------------------------------------------------------------
// Helper: verify project exists
// ---------------------------------------------------------------------------

async function verifyProject(projectId: string): Promise<boolean> {
  const project = await queryOne<{ id: string }>(
    "SELECT id FROM projects WHERE id = $1",
    [projectId],
  );
  return project !== null;
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/logs
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!(await verifyProject(id))) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "100", 10)),
    );
    const category = url.searchParams.get("category") ?? "";
    const level = url.searchParams.get("level") ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    // Build dynamic WHERE clauses
    const conditions: string[] = ["project_id = $1"];
    const values: unknown[] = [id];
    let paramIndex = 2;

    if (category && validateCategory(category)) {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    if (level && validateLevel(level)) {
      conditions.push(`level = $${paramIndex}`);
      values.push(level);
      paramIndex++;
    }

    if (search) {
      conditions.push(`message ILIKE $${paramIndex}`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (from) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(from);
      paramIndex++;
    }

    if (to) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(to);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    // Count
    const countResult = await query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM litebase.logs ${whereClause}`,
      values,
    );
    const totalCount = countResult.rows[0]?.cnt ?? 0;

    // Fetch logs
    const logsResult = await query<LogEntry>(
      `SELECT id, level, category, message, metadata, created_at
       FROM litebase.logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, pageSize, offset],
    );

    const response: LogsResponse = {
      logs: logsResult.rows,
      totalCount,
    };

    return NextResponse.json(
      { success: true, data: response } satisfies ApiResponse<LogsResponse>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/logs
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!(await verifyProject(id))) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const body = (await request.json()) as CreateLogRequest;

    if (!body.level || !validateLevel(body.level)) {
      return NextResponse.json(
        { success: false, error: "Invalid level. Must be one of: debug, info, warn, error" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.category || !validateCategory(body.category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category. Must be one of: auth, api, system" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    logEvent(
      id,
      body.level as "debug" | "info" | "warn" | "error",
      body.category as "auth" | "api" | "system",
      body.message,
      body.metadata,
    );

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create log";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
