"use client";

import { useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, Copy } from "lucide-react";
import type { ApiResponse, Project } from "@/lib/types";

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateProjectDialogProps {
  readonly onCreated?: () => void;
}

export function CreateProjectDialog({ onCreated }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDisplayName("");
    setName("");
    setNameManuallyEdited(false);
    setCreating(false);
    setError(null);
    setCreatedProject(null);
    setCopiedField(null);
  }, []);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!nameManuallyEdited) {
      setName(slugify(value));
    }
  };

  const handleNameChange = (value: string) => {
    setNameManuallyEdited(true);
    setName(slugify(value));
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName }),
      });
      const json = (await res.json()) as ApiResponse<Project>;
      if (!json.success) {
        setError(json.error ?? "Failed to create project");
        setCreating(false);
        return;
      }
      setCreatedProject(json.data ?? null);
      setCreating(false);
      onCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
      setCreating(false);
    }
  };

  const handleCopy = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="bg-[#00ff88] text-black hover:bg-[#00dd77]" />
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        New Project
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {!createdProject ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Each project gets its own database, auth, and API.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="displayName"
                  className="text-sm font-medium text-foreground"
                >
                  Display Name
                </label>
                <Input
                  id="displayName"
                  placeholder="My App"
                  value={displayName}
                  onChange={(e) =>
                    handleDisplayNameChange(
                      (e.target as HTMLInputElement).value,
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="projectName"
                  className="text-sm font-medium text-foreground"
                >
                  Project Name (slug)
                </label>
                <Input
                  id="projectName"
                  placeholder="my-app"
                  value={name}
                  onChange={(e) =>
                    handleNameChange((e.target as HTMLInputElement).value)
                  }
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, alphanumeric, hyphens only. Used in database name
                  and container names.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={creating || !name || !displayName}
                className="bg-[#00ff88] text-black hover:bg-[#00dd77]"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#00ff88]" />
                Project Created
              </DialogTitle>
              <DialogDescription>
                Save these credentials — the service role key won&apos;t be
                shown again in full.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <ConnectionField
                label="API URL"
                value={`http://localhost:${createdProject.postgrest_port}`}
                copied={copiedField === "api_url"}
                onCopy={(v) => handleCopy("api_url", v)}
              />
              <ConnectionField
                label="Auth URL"
                value={`http://localhost:${createdProject.gotrue_port}`}
                copied={copiedField === "auth_url"}
                onCopy={(v) => handleCopy("auth_url", v)}
              />
              <ConnectionField
                label="Anon Key"
                value={createdProject.anon_key}
                copied={copiedField === "anon_key"}
                onCopy={(v) => handleCopy("anon_key", v)}
                truncate
              />
              <ConnectionField
                label="Service Role Key"
                value={createdProject.service_role_key}
                copied={copiedField === "service_role_key"}
                onCopy={(v) => handleCopy("service_role_key", v)}
                truncate
              />
              <ConnectionField
                label="Database"
                value={`postgresql://postgres:postgres@localhost:5432/${createdProject.db_name}`}
                copied={copiedField === "db"}
                onCopy={(v) => handleCopy("db", v)}
                truncate
              />
            </div>

            <DialogFooter>
              <Button
                onClick={() => handleOpenChange(false)}
                className="bg-[#00ff88] text-black hover:bg-[#00dd77]"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Connection field sub-component
// ---------------------------------------------------------------------------

interface ConnectionFieldProps {
  readonly label: string;
  readonly value: string;
  readonly copied: boolean;
  readonly onCopy: (value: string) => void;
  readonly truncate?: boolean;
}

function ConnectionField({
  label,
  value,
  copied,
  onCopy,
  truncate,
}: ConnectionFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 rounded bg-muted px-2 py-1.5 text-xs font-mono ${
            truncate ? "truncate" : ""
          }`}
        >
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onCopy(value)}
        >
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
