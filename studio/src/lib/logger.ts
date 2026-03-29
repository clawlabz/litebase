import { query } from "@/lib/db";

// ---------------------------------------------------------------------------
// Log level & category types
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogCategory = "auth" | "api" | "system";

// ---------------------------------------------------------------------------
// Fire-and-forget log writer
// ---------------------------------------------------------------------------

/**
 * Inserts a log entry into litebase.logs.
 *
 * This function is intentionally fire-and-forget: it does not throw or block
 * the calling request. Errors are silently ignored so that logging failures
 * never affect the primary request path.
 */
export function logEvent(
  projectId: string,
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  // Fire and forget -- caller should NOT await this
  void query(
    `INSERT INTO litebase.logs (project_id, level, category, message, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [projectId, level, category, message, metadata ? JSON.stringify(metadata) : "{}"],
  ).catch(() => {
    // Intentionally swallowed -- logging must never break the request
  });
}
