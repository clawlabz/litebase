"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Copy,
  HardDrive,
  Loader2,
  Pause,
  Play,
  Table2,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useProject } from "@/hooks/use-project";
import type { ApiResponse, ProjectStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
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

type ServiceStatus = "running" | "stopped" | "not_found";

function serviceStatusBadge(status: ServiceStatus) {
  switch (status) {
    case "running":
      return (
        <Badge variant="secondary" className="gap-1.5 text-[10px]">
          <Wifi className="h-3 w-3 text-[#00ff88]" />
          Running
        </Badge>
      );
    case "stopped":
      return (
        <Badge variant="secondary" className="gap-1.5 text-[10px]">
          <WifiOff className="h-3 w-3 text-yellow-500" />
          Stopped
        </Badge>
      );
    case "not_found":
      return (
        <Badge variant="secondary" className="gap-1.5 text-[10px]">
          <WifiOff className="h-3 w-3 text-zinc-500" />
          Not Found
        </Badge>
      );
  }
}

// ---------------------------------------------------------------------------
// Copy field component
// ---------------------------------------------------------------------------

function CopyField({
  label,
  value,
  mono = true,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded bg-muted px-2.5 py-1.5 text-xs ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </code>
        <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3 w-3 text-[#00ff88]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { project, loading, error, refetch } = useProject(id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handlePause = async () => {
    if (!project) return;
    setActionLoading("pause");
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/pause`, {
        method: "POST",
      });
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        // Could show toast here
      }
      await refetch();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    if (!project) return;
    setActionLoading("resume");
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/resume`, {
        method: "POST",
      });
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        // Could show toast here
      }
      await refetch();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/studio/projects/${project.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        router.push("/");
      }
    } finally {
      setActionLoading(null);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to Projects
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error ?? "Project not found"}
        </div>
      </div>
    );
  }

  const pgHost = process.env.NEXT_PUBLIC_PG_HOST ?? "localhost";
  const pgPort = process.env.NEXT_PUBLIC_PG_PORT ?? "5432";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {project.display_name}
              </h1>
              <Badge
                variant="secondary"
                className="flex items-center gap-1.5 h-5 px-2 text-[10px]"
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor(project.status)}`}
                />
                {statusLabel(project.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {project.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={actionLoading !== null}
            >
              {actionLoading === "pause" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pause className="mr-1 h-3.5 w-3.5" />
              )}
              Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResume}
              disabled={actionLoading !== null}
            >
              {actionLoading === "resume" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1 h-3.5 w-3.5" />
              )}
              Resume
            </Button>
          )}

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger render={<Button variant="destructive" size="sm" />}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Project</DialogTitle>
                <DialogDescription>
                  This will permanently delete the project{" "}
                  <strong>{project.name}</strong>, its database, and all
                  associated containers. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actionLoading === "delete"}
                >
                  {actionLoading === "delete" ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Project"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tables
            </CardTitle>
            <Table2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.table_count}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Auth Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.user_count}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Database Size
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.db_size}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span>GoTrue</span>
              {serviceStatusBadge(project.gotrue_status)}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>PostgREST</span>
              {serviceStatusBadge(project.postgrest_status)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Info */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Connection Info</CardTitle>
          <CardDescription>
            Use these credentials to connect from your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField
              label="API URL (PostgREST)"
              value={`http://localhost:${project.postgrest_port}`}
            />
            <CopyField
              label="Auth URL (GoTrue)"
              value={`http://localhost:${project.gotrue_port}`}
            />
          </div>
          <CopyField label="Anon Key" value={project.anon_key} />
          <CopyField
            label="Service Role Key"
            value={project.service_role_key}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField
              label="Database (Direct)"
              value={`postgresql://postgres:postgres@${pgHost}:${pgPort}/${project.db_name}`}
            />
            <CopyField label="JWT Secret" value={project.jwt_secret} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
