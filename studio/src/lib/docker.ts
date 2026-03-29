import Docker from "dockerode";

// ---------------------------------------------------------------------------
// Docker client — connects to the local Docker daemon
// ---------------------------------------------------------------------------

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectContainerConfig {
  readonly id: string;
  readonly name: string;
  readonly dbName: string;
  readonly jwtSecret: string;
  readonly gotruePort: number;
  readonly postgrestPort: number;
}

export type ContainerStatus = "running" | "stopped" | "not_found";

// ---------------------------------------------------------------------------
// Port allocation helpers
// ---------------------------------------------------------------------------

const GOTRUE_PORT_BASE = 9900;
const POSTGREST_PORT_BASE = 3100;

/**
 * Derive deterministic ports from a numeric project index.
 * In practice the caller should pass the row count / sequence from the DB.
 */
export function derivePortsFromIndex(index: number): {
  readonly gotruePort: number;
  readonly postgrestPort: number;
} {
  return {
    gotruePort: GOTRUE_PORT_BASE + index,
    postgrestPort: POSTGREST_PORT_BASE + index,
  };
}

// ---------------------------------------------------------------------------
// Container names
// ---------------------------------------------------------------------------

function gotrueContainerName(projectName: string): string {
  return `litebase-gotrue-${projectName}`;
}

function postgrestContainerName(projectName: string): string {
  return `litebase-postgrest-${projectName}`;
}

// ---------------------------------------------------------------------------
// Ensure the litebase Docker network exists
// ---------------------------------------------------------------------------

async function ensureNetwork(): Promise<void> {
  const networks = await docker.listNetworks({
    filters: { name: ["litebase"] },
  });
  const exists = networks.some((n) => n.Name === "litebase");
  if (!exists) {
    await docker.createNetwork({ Name: "litebase", Driver: "bridge" });
  }
}

// ---------------------------------------------------------------------------
// Build database connection URL for containers on the Docker network
// ---------------------------------------------------------------------------

function buildDbUrl(dbName: string): string {
  const host = process.env.PG_HOST ?? "localhost";
  const port = process.env.PG_PORT ?? "5432";
  const user = process.env.PG_USER ?? "postgres";
  const password = process.env.PG_PASSWORD ?? "postgres";
  return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
}

// ---------------------------------------------------------------------------
// Create containers for a project
// ---------------------------------------------------------------------------

export async function createProjectContainers(
  config: ProjectContainerConfig,
): Promise<{
  readonly gotrueContainerId: string;
  readonly postgrestContainerId: string;
}> {
  await ensureNetwork();

  const dbUrl = buildDbUrl(config.dbName);
  const siteUrl = process.env.GOTRUE_SITE_URL ?? "http://localhost:3000";
  const apiExternalUrl = `http://localhost:${config.gotruePort}`;

  // --- GoTrue container ---
  const gotrue = await docker.createContainer({
    Image: "supabase/gotrue:v2.158.1",
    name: gotrueContainerName(config.name),
    Env: [
      `GOTRUE_DB_DATABASE_URL=${dbUrl}?search_path=auth`,
      `GOTRUE_DB_DRIVER=postgres`,
      `GOTRUE_JWT_SECRET=${config.jwtSecret}`,
      `GOTRUE_JWT_EXP=3600`,
      `GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated`,
      `GOTRUE_SITE_URL=${siteUrl}`,
      `API_EXTERNAL_URL=${apiExternalUrl}`,
      `GOTRUE_EXTERNAL_EMAIL_ENABLED=true`,
      `GOTRUE_MAILER_AUTOCONFIRM=true`,
      `GOTRUE_DISABLE_SIGNUP=false`,
      `GOTRUE_SMS_AUTOCONFIRM=true`,
      `GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=false`,
      `GOTRUE_SMTP_HOST=${process.env.GOTRUE_SMTP_HOST ?? ""}`,
      `GOTRUE_SMTP_PORT=${process.env.GOTRUE_SMTP_PORT ?? "587"}`,
      `GOTRUE_SMTP_USER=${process.env.GOTRUE_SMTP_USER ?? ""}`,
      `GOTRUE_SMTP_PASS=${process.env.GOTRUE_SMTP_PASS ?? ""}`,
      `GOTRUE_SMTP_ADMIN_EMAIL=${process.env.GOTRUE_SMTP_ADMIN_EMAIL ?? "noreply@litebase.dev"}`,
    ],
    ExposedPorts: { "9999/tcp": {} },
    HostConfig: {
      PortBindings: {
        "9999/tcp": [{ HostPort: String(config.gotruePort) }],
      },
      NetworkMode: "litebase",
      RestartPolicy: { Name: "unless-stopped" },
    },
  });

  // --- PostgREST container ---
  const postgrest = await docker.createContainer({
    Image: "postgrest/postgrest:latest",
    name: postgrestContainerName(config.name),
    Env: [
      `PGRST_DB_URI=${dbUrl}`,
      `PGRST_JWT_SECRET=${config.jwtSecret}`,
      `PGRST_DB_ANON_ROLE=anon`,
      `PGRST_DB_SCHEMAS=public,storage,graphql_public`,
      `PGRST_DB_EXTRA_SEARCH_PATH=public,extensions`,
    ],
    ExposedPorts: { "3000/tcp": {} },
    HostConfig: {
      PortBindings: {
        "3000/tcp": [{ HostPort: String(config.postgrestPort) }],
      },
      NetworkMode: "litebase",
      RestartPolicy: { Name: "unless-stopped" },
    },
  });

  // Start both
  await gotrue.start();
  await postgrest.start();

  return {
    gotrueContainerId: gotrue.id,
    postgrestContainerId: postgrest.id,
  };
}

// ---------------------------------------------------------------------------
// Stop containers
// ---------------------------------------------------------------------------

export async function stopProjectContainers(
  projectName: string,
): Promise<void> {
  await safeStopContainer(gotrueContainerName(projectName));
  await safeStopContainer(postgrestContainerName(projectName));
}

async function safeStopContainer(name: string): Promise<void> {
  try {
    const container = docker.getContainer(name);
    await container.stop();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    // Ignore if container is already stopped or not found
    if (!msg.includes("is not running") && !msg.includes("No such container")) {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Start containers
// ---------------------------------------------------------------------------

export async function startProjectContainers(
  projectName: string,
): Promise<void> {
  await safeStartContainer(gotrueContainerName(projectName));
  await safeStartContainer(postgrestContainerName(projectName));
}

async function safeStartContainer(name: string): Promise<void> {
  try {
    const container = docker.getContainer(name);
    await container.start();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (!msg.includes("is already started") && !msg.includes("No such container")) {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Remove containers
// ---------------------------------------------------------------------------

export async function removeProjectContainers(
  projectName: string,
): Promise<void> {
  await safeRemoveContainer(gotrueContainerName(projectName));
  await safeRemoveContainer(postgrestContainerName(projectName));
}

async function safeRemoveContainer(name: string): Promise<void> {
  try {
    const container = docker.getContainer(name);
    // Force remove (stops + removes)
    await container.remove({ force: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (!msg.includes("No such container")) {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Get container status
// ---------------------------------------------------------------------------

export async function getContainerStatus(
  containerId: string,
): Promise<ContainerStatus> {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Running ? "running" : "stopped";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("No such container") || msg.includes("404")) {
      return "not_found";
    }
    throw error;
  }
}

export { docker };
