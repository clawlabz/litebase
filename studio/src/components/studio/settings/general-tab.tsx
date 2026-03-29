"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Trash2, Wifi, WifiOff } from "lucide-react";
import type { ProjectWithStats, ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneralTabProps {
  readonly project: ProjectWithStats;
  readonly onRefetch: () => void;
}

type ServiceStatus = "running" | "stopped" | "not_found";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serviceStatusBadge(label: string, status: ServiceStatus) {
  const icon =
    status === "running" ? (
      <Wifi className="h-3 w-3 text-[#00ff88]" />
    ) : (
      <WifiOff className="h-3 w-3 text-zinc-500" />
    );

  const text =
    status === "running"
      ? "Running"
      : status === "stopped"
        ? "Stopped"
        : "Not Found";

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <Badge variant="secondary" className="gap-1.5 text-[10px]">
        {icon}
        {text}
      </Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GeneralTab({ project, onRefetch }: GeneralTabProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/studio/projects/${project.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        router.push("/");
      }
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteConfirmation("");
    }
  };

  const canDelete = deleteConfirmation === project.name;

  return (
    <div className="space-y-6 mt-4">
      {/* Project Info */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Project Information</CardTitle>
          <CardDescription>Basic details about this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Project Name
              </p>
              <p className="text-sm font-mono">{project.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Display Name
              </p>
              <p className="text-sm">{project.display_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Database Name
              </p>
              <p className="text-sm font-mono">{project.database_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Created At
              </p>
              <p className="text-sm">
                {new Date(project.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Service Status</CardTitle>
          <CardDescription>
            Current status of project services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-border/50">
          {serviceStatusBadge("GoTrue (Authentication)", project.gotrue_status)}
          {serviceStatusBadge("PostgREST (API)", project.postgrest_status)}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
            <div>
              <p className="text-sm font-medium">Delete this project</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently remove this project, its database, and all
                associated containers.
              </p>
            </div>
            <Dialog open={deleteOpen} onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) setDeleteConfirmation("");
            }}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete Project
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    the project <strong>{project.name}</strong>, its database,
                    and all associated containers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <p className="text-sm">
                    Type <strong className="font-mono">{project.name}</strong> to
                    confirm:
                  </p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDeleteConfirmation(e.target.value)
                    }
                    placeholder={project.name}
                    className="font-mono"
                  />
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={!canDelete || deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "I understand, delete this project"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
