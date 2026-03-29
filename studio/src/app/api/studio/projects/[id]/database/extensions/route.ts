import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne, queryProjectDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Allowed extensions (whitelist for safety)
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = new Set([
  "uuid-ossp",
  "pgcrypto",
  "pg_trgm",
  "citext",
  "hstore",
  "pg_stat_statements",
  "btree_gist",
  "btree_gin",
  "unaccent",
  "tablefunc",
  "fuzzystrmatch",
  "intarray",
  "ltree",
  "cube",
  "earthdistance",
]);

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/database/extensions
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "POST")) return viewerBlockedResponse();
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

    const body = (await request.json()) as {
      name?: string;
      action?: string;
    };

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { success: false, error: "Extension name is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (body.action !== "enable" && body.action !== "disable") {
      return NextResponse.json(
        { success: false, error: "Action must be 'enable' or 'disable'" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const extName = body.name.trim().toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extName)) {
      return NextResponse.json(
        { success: false, error: `Extension "${extName}" is not in the allowed list` } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Use double-quoted identifier for extension name
    const quotedName = `"${extName}"`;

    if (body.action === "enable") {
      await queryProjectDb(
        project.database_name,
        `CREATE EXTENSION IF NOT EXISTS ${quotedName}`,
      );
    } else {
      await queryProjectDb(
        project.database_name,
        `DROP EXTENSION IF EXISTS ${quotedName}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { name: extName, action: body.action },
      } satisfies ApiResponse<{ name: string; action: string }>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to manage extension";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
