"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectDialog } from "@/components/studio/create-project-dialog";
import {
  Database,
  Table2,
  Users,
  HardDrive,
  Plus,
} from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import type { ProjectWithStats, ProjectStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusColor(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "bg-[#00ff88]";
    case "paused":
      return "bg-yellow-500";
    case "inactive":
      return "bg-zinc-500";
  }
}

function statusLabel(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "Running";
    case "paused":
      return "Paused";
    case "inactive":
      return "Inactive";
  }
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

function ProjectCard({ project }: { readonly project: ProjectWithStats }) {
  const created = new Date(project.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link href={`/project/${project.id}`}>
      <Card className="border-border/50 transition-colors hover:border-[#00ff88]/30 hover:bg-accent/30 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#00ff88]/10">
                <Database className="h-4 w-4 text-[#00ff88]" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {project.display_name}
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  {project.name}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1.5 h-5 px-2 text-[10px]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor(project.status)}`}
              />
              {statusLabel(project.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Table2 className="h-3 w-3" />
              <span>{project.table_count} tables</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{project.user_count} users</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              <span>{project.db_size}</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Created {created}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ProjectCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const { projects, loading, error, refetch } = useProjects();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your LiteBase database projects
          </p>
        </div>
        <CreateProjectDialog onCreated={refetch} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mb-1">No projects yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first project to get started with LiteBase.
            </CardDescription>
            <CreateProjectDialog onCreated={refetch} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
