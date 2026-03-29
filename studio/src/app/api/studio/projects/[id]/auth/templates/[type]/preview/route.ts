import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import nodemailer from "nodemailer";
import {
  DEFAULT_TEMPLATES,
  EMAIL_TEMPLATE_TYPES,
  replaceTemplateVariables,
  type EmailTemplateType,
} from "@/lib/email-templates";
import type { ApiResponse, Project } from "@/lib/types";

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/auth/templates/[type]/preview
// Send a preview email with sample data
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
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

    const body = (await request.json()) as { to?: string };

    if (!body.to || !body.to.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Get project for site URL context
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

    // Get the template (custom or default)
    const custom = await queryOne<{ subject: string; html: string }>(
      "SELECT subject, html FROM email_templates WHERE project_id = $1 AND template_type = $2",
      [id, type],
    );

    const templateType = type as EmailTemplateType;
    const subject = custom?.subject ?? DEFAULT_TEMPLATES[templateType].subject;
    const html = custom?.html ?? DEFAULT_TEMPLATES[templateType].html;

    // Determine site URL
    const siteUrl = `http://localhost:${project.gotrue_port}`;

    // Replace variables with sample data
    const renderedHtml = replaceTemplateVariables(html, siteUrl);

    // Build SMTP transport from project settings or global env
    const smtpHost = process.env.SMTP_HOST ?? "localhost";
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpUser = process.env.SMTP_USER ?? "";
    const smtpPass = process.env.SMTP_PASS ?? "";
    const smtpFrom = process.env.SMTP_FROM ?? "noreply@litebase.local";
    const smtpSecure = process.env.SMTP_SECURE === "true";

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth:
        smtpUser && smtpPass
          ? { user: smtpUser, pass: smtpPass }
          : undefined,
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: body.to,
      subject: `[Preview] ${subject}`,
      html: renderedHtml,
    });

    return NextResponse.json(
      { success: true, data: { sent_to: body.to } } satisfies ApiResponse<{ sent_to: string }>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send preview";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
