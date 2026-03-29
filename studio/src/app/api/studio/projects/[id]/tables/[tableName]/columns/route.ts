import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne, queryProjectDb } from "@/lib/db";
import { isSafeIdentifier, safeIdentifier } from "@/lib/sql-utils";
import type { ApiResponse } from "@/lib/types";

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
// POST /api/studio/projects/[id]/tables/[tableName]/columns — add column
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
    const body = (await request.json()) as {
      name: string;
      type: string;
      nullable: boolean;
      defaultValue: string | null;
    };

    if (!body.name || !isSafeIdentifier(body.name)) {
      return NextResponse.json(
        { success: false, error: "Invalid column name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { success: false, error: "Column type is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const parts = [
      `ALTER TABLE ${safeIdentifier(tableName)}`,
      `ADD COLUMN ${safeIdentifier(body.name)} ${body.type}`,
    ];

    if (!body.nullable) {
      parts.push("NOT NULL");
    }

    if (body.defaultValue) {
      parts.push(`DEFAULT ${body.defaultValue}`);
    }

    await queryProjectDb(dbName, parts.join(" "));

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to add column";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/studio/projects/[id]/tables/[tableName]/columns — drop column
// ---------------------------------------------------------------------------

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> },
) {
  const role2 = getSessionRole(await cookies());
  if (isViewerBlocked(role2, "DELETE")) return viewerBlockedResponse();
  try {
    const { id, tableName } = await params;

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { success: false, error: "Invalid table name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const columnName = url.searchParams.get("column");

    if (!columnName || !isSafeIdentifier(columnName)) {
      return NextResponse.json(
        { success: false, error: "Invalid column name" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const dbName = await getDbName(id);

    await queryProjectDb(
      dbName,
      `ALTER TABLE ${safeIdentifier(tableName)} DROP COLUMN ${safeIdentifier(columnName)}`,
    );

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to drop column";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
