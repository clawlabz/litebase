import { NextResponse } from "next/server";
import crypto from "crypto";
import { query, queryOne, metaPool } from "@/lib/db";
import { generateProjectKeys } from "@/lib/jwt";
import {
  createProjectContainers,
  derivePortsFromIndex,
} from "@/lib/docker";
import { GOTRUE_INIT_SQL } from "@/lib/gotrue-init";
import type {
  ApiResponse,
  CreateProjectRequest,
  Project,
  ProjectWithStats,
} from "@/lib/types";
import { getContainerStatus } from "@/lib/docker";
import { createProjectPool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const NAME_RE = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

function validateProjectName(name: string): string | null {
  if (!name) return "Name is required";
  if (!NAME_RE.test(name)) {
    return "Name must be 3-50 chars, lowercase alphanumeric + hyphens, start with letter";
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST /api/studio/projects — create a new project
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProjectRequest;
    const { name, displayName } = body;

    // 1. Validate
    const nameError = validateProjectName(name);
    if (nameError) {
      return NextResponse.json(
        { success: false, error: nameError } satisfies ApiResponse,
        { status: 400 },
      );
    }

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Display name is required" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    // Check uniqueness
    const existing = await queryOne(
      "SELECT id FROM projects WHERE name = $1",
      [name],
    );
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A project with this name already exists" } satisfies ApiResponse,
        { status: 409 },
      );
    }

    // 2. Generate secrets & keys
    const jwtSecret = crypto.randomBytes(32).toString("hex");
    const { anonKey, serviceRoleKey } = generateProjectKeys(jwtSecret);

    // 3. Derive ports
    const countResult = await query("SELECT COUNT(*)::int AS cnt FROM projects");
    const index = (countResult.rows[0] as { cnt: number }).cnt;
    const { gotruePort, postgrestPort } = derivePortsFromIndex(index);

    // 4. Create database
    const dbName = `litebase_${name.replace(/-/g, "_")}`;

    // CREATE DATABASE cannot run inside a transaction
    await metaPool.query(`CREATE DATABASE "${dbName}"`);

    // 5. Init auth schema in the new database
    const projectPool = createProjectPool(dbName);
    try {
      await projectPool.query(GOTRUE_INIT_SQL);
    } finally {
      await projectPool.end();
    }

    // 6. Create Docker containers
    let gotrueContainerId = "";
    let postgrestContainerId = "";
    try {
      const containers = await createProjectContainers({
        id: crypto.randomUUID(),
        name,
        dbName,
        jwtSecret,
        gotruePort,
        postgrestPort,
      });
      gotrueContainerId = containers.gotrueContainerId;
      postgrestContainerId = containers.postgrestContainerId;
    } catch (dockerError: unknown) {
      // Docker might not be available in dev — still save the project
      const msg =
        dockerError instanceof Error ? dockerError.message : "Docker error";
      // We'll store empty container IDs; user can retry via resume
      gotrueContainerId = "";
      postgrestContainerId = "";
      // Log but don't fail
      // eslint-disable-next-line no-console
      console.warn(`Docker container creation failed: ${msg}`);
    }

    // 7. Insert project record
    const result = await queryOne<Project>(
      `INSERT INTO projects (
        name, display_name, db_name, jwt_secret,
        anon_key, service_role_key,
        gotrue_container_id, postgrest_container_id,
        gotrue_port, postgrest_port,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *`,
      [
        name,
        displayName.trim(),
        dbName,
        jwtSecret,
        anonKey,
        serviceRoleKey,
        gotrueContainerId || null,
        postgrestContainerId || null,
        gotruePort,
        postgrestPort,
      ],
    );

    return NextResponse.json(
      { success: true, data: result } satisfies ApiResponse<Project | null>,
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/studio/projects — list all projects
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const result = await query<Project>(
      "SELECT * FROM projects ORDER BY created_at DESC",
    );

    // Enrich with stats + container status
    const projects: ProjectWithStats[] = await Promise.all(
      result.rows.map(async (project) => {
        // Container status
        const gotrueStatus = project.gotrue_container_id
          ? await getContainerStatus(project.gotrue_container_id)
          : ("not_found" as const);
        const postgrestStatus = project.postgrest_container_id
          ? await getContainerStatus(project.postgrest_container_id)
          : ("not_found" as const);

        // DB stats (best-effort)
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
          // DB might not exist yet or be unreachable
        }

        return {
          ...project,
          table_count: tableCount,
          user_count: userCount,
          db_size: dbSize,
          gotrue_status: gotrueStatus,
          postgrest_status: postgrestStatus,
        };
      }),
    );

    return NextResponse.json(
      { success: true, data: projects } satisfies ApiResponse<ProjectWithStats[]>,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list projects";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
