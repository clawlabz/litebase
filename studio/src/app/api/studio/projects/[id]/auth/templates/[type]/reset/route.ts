import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { query } from "@/lib/db";
import {
  DEFAULT_TEMPLATES,
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/lib/email-templates";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/auth/templates/[type]/reset
// Delete custom template, reverting to default
// ---------------------------------------------------------------------------

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "POST")) return viewerBlockedResponse();
  try {
    const { id, type } = await params;

    if (!EMAIL_TEMPLATE_TYPES.includes(type as EmailTemplateType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid template type: ${type}`,
        } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Delete the custom template
    await query(
      "DELETE FROM email_templates WHERE project_id = $1 AND template_type = $2",
      [id, type],
    );

    // Return the default template
    const templateType = type as EmailTemplateType;
    const defaultTemplate = DEFAULT_TEMPLATES[templateType];

    return NextResponse.json(
      { success: true, data: defaultTemplate } satisfies ApiResponse<EmailTemplate>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to reset template";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
