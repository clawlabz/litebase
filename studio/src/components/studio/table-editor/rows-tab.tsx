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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { CellRenderer } from "@/components/studio/table-editor/cell-renderer";
import type { ColumnInfo, PaginatedRows } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RowsTabProps {
  readonly projectId: string;
  readonly tableName: string;
  readonly columns: readonly ColumnInfo[];
  readonly pkColumn: ColumnInfo | null;
  readonly data: PaginatedRows | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly page: number;
  readonly pageSize: number;
  readonly sortColumn: string | null;
  readonly sortOrder: "asc" | "desc";
  readonly onSort: (column: string) => void;
  readonly onPageChange: (page: number) => void;
  readonly onInsertRow: (data: Record<string, unknown>) => Promise<boolean>;
  readonly onUpdateRow: (
    pk: { column: string; value: unknown },
    data: Record<string, unknown>,
  ) => Promise<boolean>;
  readonly onDeleteRows: (
    pks: ReadonlyArray<{ column: string; value: unknown }>,
  ) => Promise<boolean>;
}

// Track which cells are being edited
interface EditState {
  readonly rowIndex: number;
  readonly changes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RowsTab({
  columns,
  pkColumn,
  data,
  loading,
  error,
  page,
  pageSize,
  sortColumn,
  sortOrder,
  onSort,
  onPageChange,
  onInsertRow,
  onUpdateRow,
  onDeleteRows,
}: RowsTabProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editStates, setEditStates] = useState<Map<number, EditState>>(
    new Map(),
  );
  const [newRowData, setNewRowData] = useState<Record<string, string> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Toggle row selection
  const toggleRow = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  // Toggle all rows
  const toggleAll = useCallback(() => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    }
  }, [selectedRows.size, rows]);

  // Start editing a cell
  const startEdit = useCallback(
    (rowIndex: number, colName: string, currentValue: unknown) => {
      setEditStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(rowIndex);
        if (!existing) {
          next.set(rowIndex, {
            rowIndex,
            changes: { [colName]: currentValue },
          });
        } else {
          if (!(colName in existing.changes)) {
            next.set(rowIndex, {
              ...existing,
              changes: { ...existing.changes, [colName]: currentValue },
            });
          }
        }
        return next;
      });
    },
    [],
  );

  // Update an edit value
  const updateEdit = useCallback(
    (rowIndex: number, colName: string, value: unknown) => {
      setEditStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(rowIndex);
        if (existing) {
          next.set(rowIndex, {
            ...existing,
            changes: { ...existing.changes, [colName]: value },
          });
        }
        return next;
      });
    },
    [],
  );

  // Cancel edits for a row
  const cancelEdit = useCallback((rowIndex: number) => {
    setEditStates((prev) => {
      const next = new Map(prev);
      next.delete(rowIndex);
      return next;
    });
  }, []);

  // Save edits for a row
  const saveEdit = useCallback(
    async (rowIndex: number) => {
      if (!pkColumn) return;
      const editState = editStates.get(rowIndex);
      if (!editState) return;

      const row = rows[rowIndex];
      const pkValue = row[pkColumn.name];

      // Only send columns that actually changed
      const changes: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(editState.changes)) {
        if (val !== row[key]) {
          changes[key] = val;
        }
      }

      if (Object.keys(changes).length === 0) {
        cancelEdit(rowIndex);
        return;
      }

      setSaving(true);
      const success = await onUpdateRow(
        { column: pkColumn.name, value: pkValue },
        changes,
      );
      setSaving(false);

      if (success) {
        cancelEdit(rowIndex);
      }
    },
    [editStates, rows, pkColumn, onUpdateRow, cancelEdit],
  );

  // Add new row
  const handleAddRow = useCallback(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      initial[col.name] = "";
    }
    setNewRowData(initial);
  }, [columns]);

  // Save new row
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;
    setSaving(true);

    // Filter out empty values (let DB defaults apply)
    const data: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(newRowData)) {
      if (val !== "") {
        data[key] = val;
      }
    }

    const success = await onInsertRow(data);
    setSaving(false);
    if (success) {
      setNewRowData(null);
    }
  }, [newRowData, onInsertRow]);

  // Delete selected rows
  const handleDeleteSelected = useCallback(async () => {
    if (!pkColumn || selectedRows.size === 0) return;

    setDeleting(true);
    const pks = Array.from(selectedRows).map((idx) => ({
      column: pkColumn.name,
      value: rows[idx][pkColumn.name],
    }));

    const success = await onDeleteRows(pks);
    setDeleting(false);
    if (success) {
      setSelectedRows(new Set());
    }
  }, [pkColumn, selectedRows, rows, onDeleteRows]);

  // Sort icon
  const sortIcon = (col: string) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#00ff88]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#00ff88]" />
    );
  };

  if (loading && !data) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button
          variant="outline"
          size="xs"
          onClick={handleAddRow}
          disabled={newRowData !== null}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Row
        </Button>
        {selectedRows.size > 0 && (
          <Button
            variant="destructive"
            size="xs"
            onClick={handleDeleteSelected}
            disabled={!pkColumn || deleting}
          >
            {deleting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-3 w-3" />
            )}
            Delete {selectedRows.size} row{selectedRows.size > 1 ? "s" : ""}
          </Button>
        )}
        {!pkColumn && columns.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            No primary key -- editing disabled
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {/* Checkbox column */}
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selectedRows.size === rows.length}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-border"
                />
              </TableHead>
              {/* Edit actions column */}
              {pkColumn && (
                <TableHead className="w-16 text-center text-[10px]">
                  Actions
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.name}>
                  <button
                    type="button"
                    onClick={() => onSort(col.name)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <span>{col.name}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {col.type}
                    </span>
                    {sortIcon(col.name)}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const editState = editStates.get(idx);
              const isEditing = editState !== undefined;

              return (
                <TableRow
                  key={idx}
                  data-state={selectedRows.has(idx) ? "selected" : undefined}
                >
                  {/* Checkbox */}
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => toggleRow(idx)}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                  </TableCell>
                  {/* Actions */}
                  {pkColumn && (
                    <TableCell className="w-16">
                      {isEditing && (
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => void saveEdit(idx)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3 text-[#00ff88]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => cancelEdit(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                  {/* Data cells */}
                  {columns.map((col) => {
                    const cellValue = row[col.name];
                    const isEditingCell =
                      isEditing && col.name in editState.changes;

                    return (
                      <TableCell
                        key={col.name}
                        className="max-w-[300px] cursor-pointer"
                        onClick={() => {
                          if (pkColumn && !col.is_primary_key) {
                            startEdit(idx, col.name, cellValue);
                          }
                        }}
                      >
                        {isEditingCell ? (
                          <Input
                            className="h-7 text-xs"
                            value={String(editState.changes[col.name] ?? "")}
                            onChange={(e) =>
                              updateEdit(idx, col.name, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveEdit(idx);
                              if (e.key === "Escape") cancelEdit(idx);
                            }}
                            autoFocus
                          />
                        ) : (
                          <CellRenderer value={cellValue} type={col.type} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            {/* New row */}
            {newRowData && (
              <TableRow className="bg-emerald-500/5">
                <TableCell className="w-10" />
                {pkColumn && (
                  <TableCell className="w-16">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => void handleSaveNewRow()}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 text-[#00ff88]" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setNewRowData(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.name}>
                    <Input
                      className="h-7 text-xs"
                      placeholder={col.default_value ? `default: ${col.default_value}` : col.name}
                      value={newRowData[col.name] ?? ""}
                      onChange={(e) =>
                        setNewRowData((prev) =>
                          prev ? { ...prev, [col.name]: e.target.value } : null,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveNewRow();
                        if (e.key === "Escape") setNewRowData(null);
                      }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            )}

            {/* Empty state */}
            {rows.length === 0 && !newRowData && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (pkColumn ? 2 : 1)}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No rows. Click &quot;Add Row&quot; to insert data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {totalCount.toLocaleString()} total row{totalCount !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
