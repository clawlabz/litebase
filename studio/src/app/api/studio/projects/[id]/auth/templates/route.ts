import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  DEFAULT_TEMPLATES,
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplate,
} from "@/lib/email-templates";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/auth/templates
// Return all email templates for this project. Falls back to defaults.
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Fetch any custom templates stored for this project
    const result = await query<{
      template_type: string;
      subject: string;
      html: string;
    }>(
      "SELECT template_type, subject, html FROM email_templates WHERE project_id = $1",
      [id],
    );

    const customMap = new Map(
      result.rows.map((r) => [r.template_type, r]),
    );

    // Merge: custom overrides defaults
    const templates: EmailTemplate[] = EMAIL_TEMPLATE_TYPES.map((type) => {
      const custom = customMap.get(type);
      if (custom) {
        return { type, subject: custom.subject, html: custom.html };
      }
      return DEFAULT_TEMPLATES[type];
    });

    return NextResponse.json(
      { success: true, data: templates } satisfies ApiResponse<EmailTemplate[]>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
