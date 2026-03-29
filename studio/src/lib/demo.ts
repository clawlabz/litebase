import { NextResponse } from "next/server";

export type StudioRole = "admin" | "viewer";

export function isViewerBlocked(role: StudioRole, method: string): boolean {
  if (role === "admin") return false;
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function viewerBlockedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Read-only access. Contact admin for write permissions.",
      readonly: true,
    },
    { status: 403 },
  );
}
