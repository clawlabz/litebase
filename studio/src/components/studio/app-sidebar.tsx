"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table2,
  Terminal,
  Shield,
  FileCode2,
  Settings,
  ScrollText,
  Database,
  LogOut,
  LayoutDashboard,
  Mail,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/studio/create-project-dialog";
import { useProjects } from "@/hooks/use-projects";
import type { ProjectStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusDot({ status }: { readonly status: ProjectStatus }) {
  const color =
    status === "active"
      ? "bg-[#00ff88]"
      : status === "paused"
        ? "bg-yellow-500"
        : "bg-zinc-500";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------

const TOOL_NAV = [
  { title: "Overview",        href: "",                icon: LayoutDashboard, exact: true  },
  { title: "Table Editor",    href: "/tables",         icon: Table2,          exact: false },
  { title: "SQL Editor",      href: "/sql",            icon: Terminal,        exact: false },
  { title: "Auth",            href: "/auth",           icon: Shield,          exact: true  },
  { title: "Email Templates", href: "/auth/templates", icon: Mail,            exact: false },
  { title: "API Docs",        href: "/api-docs",       icon: FileCode2,       exact: false },
  { title: "Logs",            href: "/logs",           icon: ScrollText,      exact: false },
  { title: "Settings",        href: "/settings",       icon: Settings,        exact: false },
] as const;

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { projects, refetch } = useProjects();

  // Current project from URL
  const projectMatch = pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const projectBase = projectId ? `/project/${projectId}` : null;
  const currentProject = projectId ? projects.find((p) => p.id === projectId) : null;

  // Tool path within a project (e.g. "/tables"), used when switching projects
  const toolPath = projectBase ? pathname.slice(projectBase.length) : "";

  const handleSelectProject = (id: string) => {
    router.push(`/project/${id}${toolPath}`);
  };

  return (
    <Sidebar collapsible="icon">
      {/* ------------------------------------------------------------------ */}
      {/* Header: logo + project picker                                        */}
      {/* ------------------------------------------------------------------ */}
      <SidebarHeader className="gap-0">
        {/* Logo row */}
        <div className="flex h-12 items-center gap-2.5 px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#00ff88]/10 text-[#00ff88]">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            LiteBase
          </span>
        </div>

        {/* Project picker */}
        <div className="px-3 pb-3 group-data-[collapsible=icon]:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-8 w-full justify-between px-2.5 text-xs font-normal"
                />
              }
            >
              <div className="flex min-w-0 items-center gap-2">
                <StatusDot status={currentProject?.status ?? "inactive"} />
                <span className="truncate">
                  {currentProject?.display_name ?? "Select project"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-60">
              {projects.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  No projects yet
                </DropdownMenuItem>
              )}
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  className="flex items-center gap-2 text-sm"
                  onClick={() => handleSelectProject(project.id)}
                >
                  <StatusDot status={project.status} />
                  <span className="flex-1 truncate">{project.display_name}</span>
                  {project.id === projectId && (
                    <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* New project — rendered outside dropdown to avoid nesting dialogs */}
              <DropdownMenuItem
                className="flex items-center gap-2 text-sm"
                onClick={() => router.push("/")}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Manage projects</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ------------------------------------------------------------------ */}
      {/* Content: tools (always visible)                                      */}
      {/* ------------------------------------------------------------------ */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOL_NAV.map((item) => {
                const href = projectBase ? `${projectBase}${item.href}` : null;
                const isActive = href
                  ? item.exact
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/")
                  : false;

                return (
                  <SidebarMenuItem key={item.href}>
                    {href ? (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={href} />}
                      >
                        <item.icon className={isActive ? "text-[#00ff88]" : ""} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        tooltip="Select a project first"
                        className="cursor-default opacity-40"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ------------------------------------------------------------------ */}
      {/* Footer: new project + sign out                                       */}
      {/* ------------------------------------------------------------------ */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {/* New project button */}
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <CreateProjectDialog onCreated={refetch} />
          </SidebarMenuItem>

          {/* Sign out */}
          <SidebarMenuItem>
            <form action="/api/auth/logout" method="POST">
              <SidebarMenuButton
                tooltip="Sign out"
                render={<button type="submit" className="w-full" />}
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
