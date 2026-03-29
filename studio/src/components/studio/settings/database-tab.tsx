"use client";

import { useState, useEffect, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  HardDrive,
  Loader2,
  PlugZap,
  Users,
} from "lucide-react";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableStat {
  readonly name: string;
  readonly row_count: number;
  readonly total_size: string;
  readonly index_size: string;
  readonly total_bytes: number;
  readonly index_bytes: number;
}

interface ExtensionInfo {
  readonly name: string;
  readonly version: string;
  readonly comment: string | null;
}

interface DatabaseStats {
  readonly total_size: string;
  readonly total_size_bytes: number;
  readonly tables: readonly TableStat[];
  readonly active_connections: number;
  readonly extensions: readonly ExtensionInfo[];
}

interface DatabaseTabProps {
  readonly projectId: string;
}

// ---------------------------------------------------------------------------
// Common extensions that users might want to enable
// ---------------------------------------------------------------------------

const COMMON_EXTENSIONS = [
  { name: "uuid-ossp", description: "Generate universally unique identifiers (UUIDs)" },
  { name: "pgcrypto", description: "Cryptographic functions" },
  { name: "pg_trgm", description: "Trigram matching for text similarity" },
  { name: "citext", description: "Case-insensitive character string type" },
  { name: "hstore", description: "Key-value pair data type" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DatabaseTab({ projectId }: DatabaseTabProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingExt, setTogglingExt] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/database/stats`,
      );
      const json = (await res.json()) as ApiResponse<DatabaseStats>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch stats");
        return;
      }
      setStats(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const handleToggleExtension = async (
    extName: string,
    action: "enable" | "disable",
  ) => {
    setTogglingExt(extName);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/database/extensions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: extName, action }),
        },
      );
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        await fetchStats();
      }
    } finally {
      setTogglingExt(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error ?? "Failed to load database statistics"}
      </div>
    );
  }

  const installedExtNames = new Set(stats.extensions.map((e) => e.name));

  return (
    <div className="space-y-6 mt-4">
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Database Size
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_size}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Connections
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.active_connections}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Extensions
            </CardTitle>
            <PlugZap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.extensions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Statistics */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Table Statistics</CardTitle>
          <CardDescription>
            Size and row count for each table in the public schema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.tables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tables found in the public schema.
            </p>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Table</TableHead>
                    <TableHead className="text-xs text-right">Rows</TableHead>
                    <TableHead className="text-xs text-right">
                      Total Size
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Index Size
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.tables.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-mono text-xs">
                        {t.name}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {t.row_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {t.total_size}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {t.index_size}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extensions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Extensions</CardTitle>
          <CardDescription>
            Manage PostgreSQL extensions for this database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Common extensions with toggles */}
          {COMMON_EXTENSIONS.map((ext) => {
            const installed = installedExtNames.has(ext.name);
            const isToggling = togglingExt === ext.name;

            return (
              <div
                key={ext.name}
                className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium font-mono">{ext.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ext.description}
                  </p>
                </div>
                <Button
                  variant={installed ? "outline" : "default"}
                  size="sm"
                  disabled={isToggling}
                  onClick={() =>
                    handleToggleExtension(
                      ext.name,
                      installed ? "disable" : "enable",
                    )
                  }
                >
                  {isToggling ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {installed ? "Disable" : "Enable"}
                </Button>
              </div>
            );
          })}

          {/* Other installed extensions */}
          {stats.extensions.filter(
            (e) => !COMMON_EXTENSIONS.some((c) => c.name === e.name),
          ).length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Other Installed Extensions
              </p>
              <div className="space-y-2">
                {stats.extensions
                  .filter(
                    (e) => !COMMON_EXTENSIONS.some((c) => c.name === e.name),
                  )
                  .map((ext) => (
                    <div
                      key={ext.name}
                      className="flex items-center justify-between px-4 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{ext.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          v{ext.version}
                        </Badge>
                      </div>
                      {ext.comment && (
                        <span className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {ext.comment}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
