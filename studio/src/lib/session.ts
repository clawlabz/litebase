import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { StudioRole } from "@/lib/demo";

const SESSION_COOKIE = "litebase_session";

interface SessionPayload {
  readonly role: StudioRole;
  readonly token: string;
}

/**
 * Read the current session role from cookies.
 * Returns "viewer" if the cookie is missing or malformed (defensive default).
 */
export function getSessionRole(
  cookieStore: ReadonlyRequestCookies,
): StudioRole {
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return "viewer";

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const payload = JSON.parse(decoded) as Partial<SessionPayload>;
    if (payload.role === "admin" || payload.role === "viewer") {
      return payload.role;
    }
    return "viewer";
  } catch {
    // Legacy cookie format (pre-RBAC) — treat as admin for backwards compat
    // since only admins could log in before
    return "admin";
  }
}
