import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LevelCount {
  readonly debug: number;
  readonly info: number;
  readonly warn: number;
  readonly error: number;
}

interface CategoryCount {
  readonly auth: number;
  readonly api: number;
  readonly system: number;
}

interface LogStats {
  readonly byLevel: LevelCount;
  readonly byCategory: CategoryCount;
  readonly recentErrors: number;
  readonly total: number;
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
// GET /api/studio/projects/[id]/logs/stats
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
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

    // Count by level
    const levelResult = await query<{ level: string; cnt: number }>(
      `SELECT level, COUNT(*)::int AS cnt
       FROM litebase.logs
       WHERE project_id = $1
       GROUP BY level`,
      [id],
    );

    const levelAccum: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    for (const row of levelResult.rows) {
      if (row.level in levelAccum) {
        levelAccum[row.level] = row.cnt;
      }
    }
    const byLevel: LevelCount = {
      debug: levelAccum.debug,
      info: levelAccum.info,
      warn: levelAccum.warn,
      error: levelAccum.error,
    };

    // Count by category
    const categoryResult = await query<{ category: string; cnt: number }>(
      `SELECT category, COUNT(*)::int AS cnt
       FROM litebase.logs
       WHERE project_id = $1
       GROUP BY category`,
      [id],
    );

    const catAccum: Record<string, number> = { auth: 0, api: 0, system: 0 };
    for (const row of categoryResult.rows) {
      if (row.category in catAccum) {
        catAccum[row.category] = row.cnt;
      }
    }
    const byCategory: CategoryCount = {
      auth: catAccum.auth,
      api: catAccum.api,
      system: catAccum.system,
    };

    // Recent errors (last 24h)
    const recentResult = await query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt
       FROM litebase.logs
       WHERE project_id = $1 AND level = 'error' AND created_at >= now() - interval '24 hours'`,
      [id],
    );
    const recentErrors = recentResult.rows[0]?.cnt ?? 0;

    const total = byLevel.debug + byLevel.info + byLevel.warn + byLevel.error;

    const stats: LogStats = {
      byLevel,
      byCategory,
      recentErrors,
      total,
    };

    return NextResponse.json(
      { success: true, data: stats } satisfies ApiResponse<LogStats>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch log stats";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
