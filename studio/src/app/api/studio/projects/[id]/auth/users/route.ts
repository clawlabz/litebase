import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { queryOne, queryProjectDb } from "@/lib/db";
import type {
  ApiResponse,
  AuthUser,
  AuthUsersResponse,
  CreateAuthUserRequest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: resolve project db_name
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
// GET /api/studio/projects/[id]/auth/users
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const dbName = await getDbName(id);

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)),
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const offset = (page - 1) * pageSize;

    const whereClause = search ? "WHERE email ILIKE $1" : "";
    const countParams = search ? [`%${search}%`] : [];

    const countResult = await queryProjectDb<{ cnt: number }>(
      dbName,
      `SELECT COUNT(*)::int AS cnt FROM auth.users ${whereClause}`,
      countParams,
    );
    const totalCount = countResult.rows[0]?.cnt ?? 0;

    const selectParams = search
      ? [`%${search}%`, pageSize, offset]
      : [pageSize, offset];
    const limitOffset = search
      ? "LIMIT $2 OFFSET $3"
      : "LIMIT $1 OFFSET $2";

    const usersResult = await queryProjectDb<AuthUser>(
      dbName,
      `SELECT
        id, email, created_at, last_sign_in_at, email_confirmed_at,
        phone, raw_app_meta_data, raw_user_meta_data, is_super_admin, banned_until
      FROM auth.users
      ${whereClause}
      ORDER BY created_at DESC
      ${limitOffset}`,
      selectParams,
    );

    const response: AuthUsersResponse = {
      users: usersResult.rows,
      totalCount,
      page,
      pageSize,
    };

    return NextResponse.json(
      { success: true, data: response } satisfies ApiResponse<AuthUsersResponse>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list auth users";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/auth/users — create a new user
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const dbName = await getDbName(id);
    const body = (await request.json()) as CreateAuthUserRequest;

    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!body.password || body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Check for existing user with same email
    const existing = await queryProjectDb<{ id: string }>(
      dbName,
      "SELECT id FROM auth.users WHERE email = $1",
      [body.email],
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" } satisfies ApiResponse,
        { status: 409 },
      );
    }

    const hashedPassword = await hash(body.password, 10);
    const confirmedAt = body.email_confirm ? "now()" : "NULL";

    const result = await queryProjectDb<AuthUser>(
      dbName,
      `INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated', $1, $2,
        ${confirmedAt}, '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now(), '', '', '', ''
      ) RETURNING id, email, created_at, last_sign_in_at, email_confirmed_at,
        phone, raw_app_meta_data, raw_user_meta_data, is_super_admin, banned_until`,
      [body.email, hashedPassword],
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] } satisfies ApiResponse<AuthUser>,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
