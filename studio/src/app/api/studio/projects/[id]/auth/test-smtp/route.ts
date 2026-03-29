import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { queryOne } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/auth/test-smtp
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { to?: string };

    if (!body.to || !body.to.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid recipient email is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const project = await queryOne<{
      smtp_host: string | null;
      smtp_port: number | null;
      smtp_user: string | null;
      smtp_pass: string | null;
      smtp_from: string | null;
      smtp_from_name: string | null;
      display_name: string;
    }>(
      `SELECT smtp_host, COALESCE(smtp_port, 587) AS smtp_port,
        smtp_user, smtp_pass, smtp_from, smtp_from_name, display_name
      FROM projects WHERE id = $1`,
      [id],
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    if (!project.smtp_host) {
      return NextResponse.json(
        { success: false, error: "SMTP is not configured for this project" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: project.smtp_host,
      port: project.smtp_port ?? 587,
      secure: (project.smtp_port ?? 587) === 465,
      auth:
        project.smtp_user && project.smtp_pass
          ? { user: project.smtp_user, pass: project.smtp_pass }
          : undefined,
    });

    const fromAddress = project.smtp_from ?? `noreply@${project.smtp_host}`;
    const fromName = project.smtp_from_name ?? project.display_name;

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: body.to,
      subject: `LiteBase SMTP Test — ${project.display_name}`,
      text: "This is a test email sent from LiteBase Studio to verify your SMTP configuration.",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>SMTP Configuration Test</h2>
          <p>This is a test email sent from <strong>LiteBase Studio</strong> to verify your SMTP configuration for project <strong>${project.display_name}</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you received this email, your SMTP settings are working correctly.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { success: true, data: { message: "Test email sent successfully" } } satisfies ApiResponse<{ message: string }>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send test email";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
