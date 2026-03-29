import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne, queryProjectDb } from "@/lib/db";
import type {
  ApiResponse,
  AuthUser,
  UpdateAuthUserRequest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: resolve project database_name
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
// GET /api/studio/projects/[id]/auth/users/[userId]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params;
    const dbName = await getDbName(id);

    const result = await queryProjectDb<AuthUser>(
      dbName,
      `SELECT
        id, email, created_at, last_sign_in_at, email_confirmed_at,
        phone, raw_app_meta_data, raw_user_meta_data, is_super_admin, banned_until
      FROM auth.users
      WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: result.rows[0] } satisfies ApiResponse<AuthUser>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get user";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/studio/projects/[id]/auth/users/[userId]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "PATCH")) return viewerBlockedResponse();
  try {
    const { id, userId } = await params;
    const dbName = await getDbName(id);
    const body = (await request.json()) as UpdateAuthUserRequest;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.email !== undefined) {
      if (!body.email.includes("@")) {
        return NextResponse.json(
          { success: false, error: "Invalid email address" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(body.email);
    }

    if (body.user_metadata !== undefined) {
      updates.push(`raw_user_meta_data = $${paramIndex++}`);
      values.push(JSON.stringify(body.user_metadata));
    }

    if (body.banned_until !== undefined) {
      updates.push(`banned_until = $${paramIndex++}`);
      values.push(body.banned_until);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    updates.push(`updated_at = now()`);
    values.push(userId);

    const result = await queryProjectDb<AuthUser>(
      dbName,
      `UPDATE auth.users SET ${updates.join(", ")} WHERE id = $${paramIndex}
      RETURNING id, email, created_at, last_sign_in_at, email_confirmed_at,
        phone, raw_app_meta_data, raw_user_meta_data, is_super_admin, banned_until`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: result.rows[0] } satisfies ApiResponse<AuthUser>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update user";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/studio/projects/[id]/auth/users/[userId]
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const role2 = getSessionRole(await cookies());
  if (isViewerBlocked(role2, "DELETE")) return viewerBlockedResponse();
  try {
    const { id, userId } = await params;
    const dbName = await getDbName(id);

    const result = await queryProjectDb(
      dbName,
      "DELETE FROM auth.users WHERE id = $1 RETURNING id",
      [userId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete user";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
