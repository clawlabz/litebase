"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/studio/create-project-dialog";
import { useProjects } from "@/hooks/use-projects";
import type { ProjectStatus } from "@/lib/types";

function StatusDot({ status }: { readonly status: ProjectStatus }) {
  const color =
    status === "active"
      ? "bg-[#00ff88]"
      : status === "paused"
        ? "bg-yellow-500"
        : "bg-zinc-500";

  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function statusLabel(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "running";
    case "paused":
      return "paused";
    case "inactive":
      return "stopped";
  }
}

export function Header() {
  const { projects, refetch } = useProjects();
  const router = useRouter();
  const pathname = usePathname();

  // Determine current project from URL /project/[id]
  const projectIdMatch = pathname.match(/^\/project\/([^/]+)/);
  const currentProjectId = projectIdMatch?.[1] ?? null;
  const currentProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId)
    : null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-5" />

      {projects.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium" />
            }
          >
            <Database className="h-4 w-4 text-[#00ff88]" />
            <span>{currentProject?.display_name ?? "Select project"}</span>
            {currentProject && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] font-normal"
              >
                {statusLabel(currentProject.status)}
              </Badge>
            )}
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className="flex items-center gap-2"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <StatusDot status={project.status} />
                <span>{project.display_name}</span>
                <Badge
                  variant="outline"
                  className="ml-auto h-5 px-1.5 text-[10px]"
                >
                  {statusLabel(project.status)}
                </Badge>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => router.push("/")}
            >
              All Projects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-sm text-muted-foreground">LiteBase Studio</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <CreateProjectDialog onCreated={refetch} />
      </div>
    </header>
  );
}
