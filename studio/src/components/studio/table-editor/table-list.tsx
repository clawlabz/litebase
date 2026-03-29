"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Table2 } from "lucide-react";
import type { TableInfo } from "@/lib/types";

interface TableListProps {
  readonly tables: readonly TableInfo[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly selectedTable: string | null;
  readonly onSelectTable: (name: string) => void;
  readonly onNewTable: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TableList({
  tables,
  loading,
  error,
  selectedTable,
  onSelectTable,
  onNewTable,
}: TableListProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? tables.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()),
      )
    : tables;

  return (
    <div className="flex w-64 shrink-0 flex-col bg-muted/20">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 text-xs text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Table2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">
              {search ? "No matching tables" : "No tables yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1.5">
            {filtered.map((table) => (
              <button
                key={table.name}
                type="button"
                onClick={() => onSelectTable(table.name)}
                className={`flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors ${
                  selectedTable === table.name
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-xs font-medium">{table.name}</span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  ~{table.row_count_estimate.toLocaleString()} rows
                  {" / "}
                  {formatSize(table.size_bytes)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New table button */}
      <div className="border-t p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-1.5 text-xs"
          onClick={onNewTable}
        >
          <Plus className="h-3.5 w-3.5" />
          New Table
        </Button>
      </div>
    </div>
  );
}
