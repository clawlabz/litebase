"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Key, Link2, Plus, Trash2, Loader2 } from "lucide-react";
import { COLUMN_TYPES } from "@/components/studio/table-editor/column-types";
import type { ApiResponse, TableSchema } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SchemaTabProps {
  readonly projectId: string;
  readonly tableName: string;
  readonly schema: TableSchema | null;
  readonly onSchemaChanged: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SchemaTab({
  projectId,
  tableName,
  schema,
  onSchemaChanged,
}: SchemaTabProps) {
  const [addColOpen, setAddColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("text");
  const [newColNullable, setNewColNullable] = useState(true);
  const [newColDefault, setNewColDefault] = useState("");
  const [addColLoading, setAddColLoading] = useState(false);
  const [addColError, setAddColError] = useState<string | null>(null);

  const [dropColTarget, setDropColTarget] = useState<string | null>(null);
  const [dropColLoading, setDropColLoading] = useState(false);

  const columns = schema?.columns ?? [];
  const indexes = schema?.indexes ?? [];

  // Add column via ALTER TABLE
  const handleAddColumn = useCallback(async () => {
    if (!newColName.trim()) return;
    setAddColLoading(true);
    setAddColError(null);
    try {
      // We'll use a generic SQL execution through the table schema endpoint
      // Actually, let's call the project DB query via a POST to add column
      // For simplicity, we'll use the same create table API pattern but
      // issue ALTER TABLE directly via the rows endpoint... Actually, we
      // should create a simple alter-table approach.
      // Best approach: Use queryProjectDb indirectly by calling our API.
      // We'll add column through a dedicated fetch to avoid needing new APIs.
      const res = await fetch(
        `/api/studio/projects/${projectId}/tables/${tableName}/columns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newColName.trim(),
            type: newColType,
            nullable: newColNullable,
            defaultValue: newColDefault || null,
          }),
        },
      );
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        setAddColError(json.error ?? "Failed to add column");
        return;
      }
      setAddColOpen(false);
      setNewColName("");
      setNewColType("text");
      setNewColNullable(true);
      setNewColDefault("");
      onSchemaChanged();
    } catch (err: unknown) {
      setAddColError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAddColLoading(false);
    }
  }, [
    projectId,
    tableName,
    newColName,
    newColType,
    newColNullable,
    newColDefault,
    onSchemaChanged,
  ]);

  // Drop column
  const handleDropColumn = useCallback(async () => {
    if (!dropColTarget) return;
    setDropColLoading(true);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/tables/${tableName}/columns?column=${encodeURIComponent(dropColTarget)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        onSchemaChanged();
      }
    } finally {
      setDropColLoading(false);
      setDropColTarget(null);
    }
  }, [projectId, tableName, dropColTarget, onSchemaChanged]);

  return (
    <div className="space-y-6 p-4">
      {/* Columns section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Columns</h3>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setAddColOpen(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Column
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Nullable</TableHead>
              <TableHead className="text-xs">Default</TableHead>
              <TableHead className="text-xs">Constraints</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col) => (
              <TableRow key={col.name}>
                <TableCell className="font-mono text-xs font-medium">
                  {col.name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {col.type}
                </TableCell>
                <TableCell className="text-xs">
                  {col.nullable ? (
                    <span className="text-muted-foreground">Yes</span>
                  ) : (
                    <span className="font-medium">NOT NULL</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-mono text-[11px] text-muted-foreground">
                  {col.default_value ?? (
                    <span className="italic text-muted-foreground/50">none</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {col.is_primary_key && (
                      <Badge variant="secondary" className="gap-1 text-[9px]">
                        <Key className="h-2.5 w-2.5" />
                        PK
                      </Badge>
                    )}
                    {col.foreign_key_ref && (
                      <Badge variant="secondary" className="gap-1 text-[9px]">
                        <Link2 className="h-2.5 w-2.5" />
                        FK: {col.foreign_key_ref}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {!col.is_primary_key && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDropColTarget(col.name)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Indexes section */}
      {indexes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">Indexes</h3>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Columns</TableHead>
                <TableHead className="text-xs">Unique</TableHead>
                <TableHead className="text-xs">Primary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indexes.map((idx) => (
                <TableRow key={idx.name}>
                  <TableCell className="font-mono text-xs">
                    {idx.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {idx.columns.join(", ")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {idx.is_unique ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {idx.is_primary ? "Yes" : "No"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add column dialog */}
      <Dialog open={addColOpen} onOpenChange={setAddColOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Add a new column to <strong>{tableName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Column Name
              </label>
              <Input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="column_name"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Type</label>
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                {COLUMN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="nullable"
                checked={newColNullable}
                onChange={(e) => setNewColNullable(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <label htmlFor="nullable" className="text-xs">
                Nullable
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Default Value
              </label>
              <Input
                value={newColDefault}
                onChange={(e) => setNewColDefault(e.target.value)}
                placeholder="e.g. 0, 'hello', now()"
                className="h-8 text-sm"
              />
            </div>
            {addColError && (
              <p className="text-xs text-destructive">{addColError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleAddColumn}
              disabled={addColLoading || !newColName.trim()}
            >
              {addColLoading ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Column"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop column confirmation */}
      <Dialog
        open={dropColTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDropColTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop Column</DialogTitle>
            <DialogDescription>
              This will permanently remove the column{" "}
              <strong>{dropColTarget}</strong> and all its data. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDropColumn}
              disabled={dropColLoading}
            >
              {dropColLoading ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Dropping...
                </>
              ) : (
                "Drop Column"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
