import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import type { ApiResponse, Project } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionInfo {
  readonly direct_url: string;
  readonly pooled_url: string;
  readonly api_url: string;
  readonly auth_url: string;
  readonly anon_key: string;
  readonly service_role_key: string;
  readonly jwt_secret: string;
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects/[id]/database/connections
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

    const pgHost = process.env.PG_HOST ?? "localhost";
    const pgPort = process.env.PG_PORT ?? "5432";
    const pgUser = process.env.PG_USER ?? "postgres";
    const pgPassword = process.env.PG_PASSWORD ?? "postgres";

    const connections: ConnectionInfo = {
      direct_url: `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${project.database_name}`,
      pooled_url: `postgresql://${pgUser}:${pgPassword}@${pgHost}:6432/${project.database_name}`,
      api_url: `http://localhost:${project.postgrest_port}`,
      auth_url: `http://localhost:${project.gotrue_port}`,
      anon_key: project.anon_key,
      service_role_key: project.service_role_key,
      jwt_secret: project.jwt_secret,
    };

    return NextResponse.json(
      { success: true, data: connections } satisfies ApiResponse<ConnectionInfo>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get connection info";
    const status = message === "Project not found" ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status },
    );
  }
}
