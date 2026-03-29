import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { query, queryOne, metaPool, createProjectPool } from "@/lib/db";
import {
  removeProjectContainers,
  getContainerStatus,
} from "@/lib/docker";
import type {
  ApiResponse,
  Project,
  ProjectWithStats,
  UpdateProjectRequest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Container status
    const gotrueStatus = project.gotrue_container_id
      ? await getContainerStatus(project.gotrue_container_id)
      : ("not_found" as const);
    const postgrestStatus = project.postgrest_container_id
      ? await getContainerStatus(project.postgrest_container_id)
      : ("not_found" as const);

    // DB stats
    let tableCount = 0;
    let userCount = 0;
    let dbSize = "0 bytes";

    try {
      const pool = createProjectPool(project.db_name);
      try {
        const tables = await pool.query(
          "SELECT COUNT(*)::int AS cnt FROM information_schema.tables WHERE table_schema = 'public'",
        );
        tableCount = (tables.rows[0] as { cnt: number }).cnt;

        const users = await pool.query(
          "SELECT COUNT(*)::int AS cnt FROM auth.users",
        );
        userCount = (users.rows[0] as { cnt: number }).cnt;

        const size = await pool.query(
          "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
        );
        dbSize = (size.rows[0] as { size: string }).size;
      } finally {
        await pool.end();
      }
    } catch {
      // DB might not exist yet
    }

    const enriched: ProjectWithStats = {
      ...project,
      table_count: tableCount,
      user_count: userCount,
      db_size: dbSize,
      gotrue_status: gotrueStatus,
      postgrest_status: postgrestStatus,
    };

    return NextResponse.json(
      { success: true, data: enriched } satisfies ApiResponse<ProjectWithStats>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get project";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/studio/projects/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "PATCH")) return viewerBlockedResponse();
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateProjectRequest;

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

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(body.display_name.trim());
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    const updated = await queryOne<Project>(
      `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return NextResponse.json(
      { success: true, data: updated } satisfies ApiResponse<Project | null>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/studio/projects/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role2 = getSessionRole(await cookies());
  if (isViewerBlocked(role2, "DELETE")) return viewerBlockedResponse();
  try {
    const { id } = await params;
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

    // 1. Stop + remove Docker containers
    try {
      await removeProjectContainers(project.name);
    } catch {
      // Continue even if Docker fails
    }

    // 2. Drop the project database
    // Must close all connections first
    try {
      await metaPool.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [project.db_name],
      );
      await metaPool.query(`DROP DATABASE IF EXISTS "${project.db_name}"`);
    } catch {
      // Continue even if drop fails
    }

    // 3. Delete project record
    await query("DELETE FROM projects WHERE id = $1", [id]);

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
