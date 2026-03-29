import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { query, queryOne } from "@/lib/db";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/lib/email-templates";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// PATCH /api/studio/projects/[id]/auth/templates/[type]
// Upsert a custom email template
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "PATCH")) return viewerBlockedResponse();
  try {
    const { id, type } = await params;

    // Validate type
    if (!EMAIL_TEMPLATE_TYPES.includes(type as EmailTemplateType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid template type: ${type}. Must be one of: ${EMAIL_TEMPLATE_TYPES.join(", ")}`,
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      subject?: string;
      html?: string;
    };

    if (!body.subject || !body.html) {
      return NextResponse.json(
        {
          success: false,
          error: "Both subject and html are required",
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Upsert
    const result = await queryOne<{
      template_type: string;
      subject: string;
      html: string;
    }>(
      `INSERT INTO email_templates (project_id, template_type, subject, html)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, template_type)
       DO UPDATE SET subject = EXCLUDED.subject, html = EXCLUDED.html, updated_at = now()
       RETURNING template_type, subject, html`,
      [id, type, body.subject, body.html],
    );

    const template: EmailTemplate = {
      type: type as EmailTemplateType,
      subject: result?.subject ?? body.subject,
      html: result?.html ?? body.html,
    };

    return NextResponse.json(
      { success: true, data: template } satisfies ApiResponse<EmailTemplate>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save template";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
