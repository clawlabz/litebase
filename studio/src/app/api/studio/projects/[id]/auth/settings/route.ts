import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { docker } from "@/lib/docker";
import type {
  ApiResponse,
  AuthSettings,
  UpdateAuthSettingsRequest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: mask SMTP password (show only last 4 chars)
// ---------------------------------------------------------------------------

function maskPassword(password: string | null): string | null {
  if (!password) return null;
  if (password.length <= 4) return "****";
  return "*".repeat(password.length - 4) + password.slice(-4);
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/auth/settings
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await queryOne<{
      auth_enable_signup: boolean;
      auth_autoconfirm: boolean;
      auth_jwt_expiry: number;
      auth_redirect_urls: string[] | null;
      smtp_host: string | null;
      smtp_port: number | null;
      smtp_user: string | null;
      smtp_pass: string | null;
      smtp_from: string | null;
      smtp_from_name: string | null;
    }>(
      `SELECT
        COALESCE(auth_enable_signup, true) AS auth_enable_signup,
        COALESCE(auth_autoconfirm, true) AS auth_autoconfirm,
        COALESCE(auth_jwt_expiry, 3600) AS auth_jwt_expiry,
        COALESCE(auth_redirect_urls, '{}') AS auth_redirect_urls,
        smtp_host, COALESCE(smtp_port, 587) AS smtp_port,
        smtp_user, smtp_pass, smtp_from, smtp_from_name
      FROM projects WHERE id = $1`,
      [id],
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const settings: AuthSettings = {
      auth_enable_signup: project.auth_enable_signup,
      auth_autoconfirm: project.auth_autoconfirm,
      auth_jwt_expiry: project.auth_jwt_expiry,
      auth_redirect_urls: project.auth_redirect_urls ?? [],
      smtp_host: project.smtp_host,
      smtp_port: project.smtp_port ?? 587,
      smtp_user: project.smtp_user,
      smtp_pass: maskPassword(project.smtp_pass),
      smtp_from: project.smtp_from,
      smtp_from_name: project.smtp_from_name,
    };

    return NextResponse.json(
      { success: true, data: settings } satisfies ApiResponse<AuthSettings>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get auth settings";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/studio/projects/[id]/auth/settings
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateAuthSettingsRequest;

    // Verify project exists
    const project = await queryOne<{
      id: string;
      gotrue_container_id: string | null;
    }>(
      "SELECT id, gotrue_container_id FROM projects WHERE id = $1",
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
    let smtpChanged = false;

    if (body.auth_enable_signup !== undefined) {
      updates.push(`auth_enable_signup = $${paramIndex++}`);
      values.push(body.auth_enable_signup);
    }
    if (body.auth_autoconfirm !== undefined) {
      updates.push(`auth_autoconfirm = $${paramIndex++}`);
      values.push(body.auth_autoconfirm);
    }
    if (body.auth_jwt_expiry !== undefined) {
      if (body.auth_jwt_expiry < 60 || body.auth_jwt_expiry > 604800) {
        return NextResponse.json(
          { success: false, error: "JWT expiry must be between 60 and 604800 seconds" } satisfies ApiResponse,
          { status: 400 },
        );
      }
      updates.push(`auth_jwt_expiry = $${paramIndex++}`);
      values.push(body.auth_jwt_expiry);
    }
    if (body.auth_redirect_urls !== undefined) {
      updates.push(`auth_redirect_urls = $${paramIndex++}`);
      values.push(body.auth_redirect_urls);
    }
    if (body.smtp_host !== undefined) {
      updates.push(`smtp_host = $${paramIndex++}`);
      values.push(body.smtp_host || null);
      smtpChanged = true;
    }
    if (body.smtp_port !== undefined) {
      updates.push(`smtp_port = $${paramIndex++}`);
      values.push(body.smtp_port);
      smtpChanged = true;
    }
    if (body.smtp_user !== undefined) {
      updates.push(`smtp_user = $${paramIndex++}`);
      values.push(body.smtp_user || null);
      smtpChanged = true;
    }
    if (body.smtp_pass !== undefined) {
      updates.push(`smtp_pass = $${paramIndex++}`);
      values.push(body.smtp_pass || null);
      smtpChanged = true;
    }
    if (body.smtp_from !== undefined) {
      updates.push(`smtp_from = $${paramIndex++}`);
      values.push(body.smtp_from || null);
      smtpChanged = true;
    }
    if (body.smtp_from_name !== undefined) {
      updates.push(`smtp_from_name = $${paramIndex++}`);
      values.push(body.smtp_from_name || null);
      smtpChanged = true;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    await queryOne(
      `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values,
    );

    // Restart GoTrue container if SMTP settings changed
    if (smtpChanged && project.gotrue_container_id) {
      try {
        const container = docker.getContainer(project.gotrue_container_id);
        await container.restart();
      } catch {
        // Non-fatal: container might not be running
      }
    }

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update auth settings";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
