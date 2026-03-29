import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionRole } from "@/lib/session";
import { isViewerBlocked, viewerBlockedResponse } from "@/lib/demo";
import { queryOne } from "@/lib/db";
import { stopProjectContainers } from "@/lib/docker";
import type { ApiResponse, Project } from "@/lib/types";

// ---------------------------------------------------------------------------
// POST /api/studio/projects/[id]/pause
// ---------------------------------------------------------------------------

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = getSessionRole(await cookies());
  if (isViewerBlocked(role, "POST")) return viewerBlockedResponse();
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

    if (project.status === "paused") {
      return NextResponse.json(
        { success: false, error: "Project is already paused" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Stop containers
    try {
      await stopProjectContainers(project.name);
    } catch {
      // Continue — container might already be stopped
    }

    // Update status
    const updated = await queryOne<Project>(
      "UPDATE projects SET status = 'paused', updated_at = now() WHERE id = $1 RETURNING *",
      [id],
    );

    return NextResponse.json(
      { success: true, data: updated } satisfies ApiResponse<Project | null>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to pause project";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
