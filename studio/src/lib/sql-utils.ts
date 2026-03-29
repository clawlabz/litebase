// ---------------------------------------------------------------------------
// SQL utility functions for safe identifier handling
// ---------------------------------------------------------------------------

/**
 * Regex whitelist for SQL identifiers (table names, column names).
 * Only allows alphanumeric + underscore, must start with letter or underscore.
 */
const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a string is a safe SQL identifier.
 * Returns true if safe, false if potentially dangerous.
 */
export function isSafeIdentifier(name: string): boolean {
  return SAFE_IDENTIFIER_RE.test(name);
}

/**
 * Validate and return a quoted SQL identifier.
 * Throws if the identifier contains unsafe characters.
 */
export function safeIdentifier(name: string): string {
  if (!isSafeIdentifier(name)) {
    throw new Error(`Unsafe SQL identifier: "${name}"`);
  }
  return `"${name}"`;
}

/**
 * Look up a project's db_name by project ID from the meta database.
 */
export async function getProjectDbName(
  projectId: string,
  queryOneFn: (sql: string, values?: readonly unknown[]) => Promise<{ db_name: string } | null>,
): Promise<string> {
  const project = await queryOneFn(
    "SELECT db_name FROM projects WHERE id = $1",
    [projectId],
  );
  if (!project) {
    throw new Error("Project not found");
  }
  return project.db_name;
}
