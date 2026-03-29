"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { COLUMN_TYPES } from "@/components/studio/table-editor/column-types";
import type { ApiResponse, CreateTableColumn } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateTableDialogProps {
  readonly projectId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: () => void;
}

interface ColumnDraft {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly defaultValue: string;
  readonly isPrimaryKey: boolean;
}

// ---------------------------------------------------------------------------
// Default columns
// ---------------------------------------------------------------------------

function createDefaultColumns(): readonly ColumnDraft[] {
  return [
    {
      id: "col-id",
      name: "id",
      type: "uuid",
      nullable: false,
      defaultValue: "gen_random_uuid()",
      isPrimaryKey: true,
    },
    {
      id: "col-created-at",
      name: "created_at",
      type: "timestamptz",
      nullable: false,
      defaultValue: "now()",
      isPrimaryKey: false,
    },
  ];
}

let colCounter = 0;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateTableDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<readonly ColumnDraft[]>(
    createDefaultColumns(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTableName("");
    setColumns(createDefaultColumns());
    setError(null);
    colCounter = 0;
  }, []);

  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) resetForm();
      onOpenChange(val);
    },
    [onOpenChange, resetForm],
  );

  const addColumn = useCallback(() => {
    colCounter += 1;
    const newCol: ColumnDraft = {
      id: `col-new-${colCounter}`,
      name: "",
      type: "text",
      nullable: true,
      defaultValue: "",
      isPrimaryKey: false,
    };
    setColumns((prev) => [...prev, newCol]);
  }, []);

  const removeColumn = useCallback((id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateColumn = useCallback(
    (id: string, field: keyof ColumnDraft, value: unknown) => {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id !== id) return col;
          if (field === "isPrimaryKey" && value === true) {
            // Ensure only one PK
            return { ...col, isPrimaryKey: true, nullable: false };
          }
          return { ...col, [field]: value };
        }).map((col) => {
          // If we just set a new PK, unset others
          if (field === "isPrimaryKey" && value === true && col.id !== id) {
            return { ...col, isPrimaryKey: false };
          }
          return col;
        }),
      );
    },
    [],
  );

  const handleCreate = useCallback(async () => {
    if (!tableName.trim()) {
      setError("Table name is required");
      return;
    }

    const validColumns = columns.filter((c) => c.name.trim());
    if (validColumns.length === 0) {
      setError("At least one column with a name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = {
        name: tableName.trim(),
        columns: validColumns.map(
          (c): CreateTableColumn => ({
            name: c.name.trim(),
            type: c.type,
            nullable: c.nullable,
            defaultValue: c.defaultValue,
            isPrimaryKey: c.isPrimaryKey,
          }),
        ),
      };

      const res = await fetch(
        `/api/studio/projects/${projectId}/tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        setError(json.error ?? "Failed to create table");
        return;
      }

      resetForm();
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId, tableName, columns, resetForm, onCreated]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Table</DialogTitle>
          <DialogDescription>
            Define a new table with columns and constraints.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Table name */}
          <div>
            <label className="mb-1 block text-xs font-medium">
              Table Name
            </label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="my_table"
              className="h-8 text-sm font-mono"
            />
          </div>

          {/* Column definitions */}
          <div>
            <label className="mb-2 block text-xs font-medium">Columns</label>
            <div className="space-y-2">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/20 p-2"
                >
                  {/* Name */}
                  <Input
                    value={col.name}
                    onChange={(e) =>
                      updateColumn(col.id, "name", e.target.value)
                    }
                    placeholder="column_name"
                    className="h-7 flex-1 text-xs font-mono"
                  />

                  {/* Type */}
                  <select
                    value={col.type}
                    onChange={(e) =>
                      updateColumn(col.id, "type", e.target.value)
                    }
                    className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-ring"
                  >
                    {COLUMN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  {/* Nullable */}
                  <label className="flex items-center gap-1 text-[10px] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={col.nullable}
                      onChange={(e) =>
                        updateColumn(col.id, "nullable", e.target.checked)
                      }
                      disabled={col.isPrimaryKey}
                      className="h-3 w-3 rounded border-border"
                    />
                    Null
                  </label>

                  {/* Primary key */}
                  <label className="flex items-center gap-1 text-[10px] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={col.isPrimaryKey}
                      onChange={(e) =>
                        updateColumn(col.id, "isPrimaryKey", e.target.checked)
                      }
                      className="h-3 w-3 rounded border-border"
                    />
                    PK
                  </label>

                  {/* Default */}
                  <Input
                    value={col.defaultValue}
                    onChange={(e) =>
                      updateColumn(col.id, "defaultValue", e.target.value)
                    }
                    placeholder="default"
                    className="h-7 w-36 text-[10px] font-mono"
                  />

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeColumn(col.id)}
                    disabled={columns.length <= 1}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="xs"
              className="mt-2"
              onClick={addColumn}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Column
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Table"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
