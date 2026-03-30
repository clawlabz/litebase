"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Map URL segments to display names
// ---------------------------------------------------------------------------

const SEGMENT_LABELS: Record<string, string> = {
  tables:    "Table Editor",
  sql:       "SQL Editor",
  auth:      "Auth",
  templates: "Email Templates",
  "api-docs":"API Docs",
  logs:      "Logs",
  settings:  "Settings",
};

function getPageTitle(pathname: string): string {
  // /project/[id]/tables → "tables"
  // /project/[id]/auth/templates → "templates"
  const segments = pathname.split("/").filter(Boolean);
  // Walk from the end to find a known label
  for (let i = segments.length - 1; i >= 0; i--) {
    const label = SEGMENT_LABELS[segments[i]];
    if (label) return label;
  }
  // /project/[id] with no further segment → Overview
  if (segments[0] === "project" && segments.length === 2) return "Overview";
  return "Projects";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </header>
  );
}
