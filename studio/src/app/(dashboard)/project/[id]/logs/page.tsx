"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ScrollText,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
} from "lucide-react";
import { useLogs, type LogEntry } from "@/hooks/use-logs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_OPTIONS = ["", "debug", "info", "warn", "error"] as const;
const CATEGORY_OPTIONS = ["", "auth", "api", "system"] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function LogsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const {
    logs,
    totalCount,
    stats,
    loading,
    page,
    pageSize,
    filters,
    autoRefresh,
    setPage,
    setAutoRefresh,
    updateFilter,
    refresh,
  } = useLogs(projectId);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View system events, auth activity, and API requests
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <SelectFilter
          value={filters.category}
          onChange={(v) => updateFilter("category", v)}
          options={CATEGORY_OPTIONS}
          placeholder="All Categories"
          labels={{ "": "All Categories", auth: "Auth", api: "API", system: "System" }}
        />

        <SelectFilter
          value={filters.level}
          onChange={(v) => updateFilter("level", v)}
          options={LEVEL_OPTIONS}
          placeholder="All Levels"
          labels={{ "": "All Levels", debug: "Debug", info: "Info", warn: "Warn", error: "Error" }}
        />

        <Input
          placeholder="Search messages..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="h-8 w-48 text-xs"
        />

        <Input
          type="datetime-local"
          value={filters.from}
          onChange={(e) => updateFilter("from", e.target.value)}
          className="h-8 w-44 text-xs"
          title="From date"
        />

        <Input
          type="datetime-local"
          value={filters.to}
          onChange={(e) => updateFilter("to", e.target.value)}
          className="h-8 w-44 text-xs"
          title="To date"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="gap-1.5 h-8"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </Button>

        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="h-8 text-xs"
        >
          {autoRefresh ? "Auto: ON" : "Auto: OFF"}
        </Button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Total" count={stats.total} icon={<ScrollText className="h-3 w-3" />} />
          <StatBadge label="Info" count={stats.byLevel.info} icon={<Info className="h-3 w-3" />} variant="info" />
          <StatBadge label="Warn" count={stats.byLevel.warn} icon={<AlertTriangle className="h-3 w-3" />} variant="warn" />
          <StatBadge label="Error" count={stats.byLevel.error} icon={<AlertCircle className="h-3 w-3" />} variant="error" />
          {stats.recentErrors > 0 && (
            <StatBadge
              label="Errors (24h)"
              count={stats.recentErrors}
              icon={<AlertCircle className="h-3 w-3" />}
              variant="error"
            />
          )}
        </div>
      )}

      {/* Log list */}
      <div className="rounded-lg border bg-card">
        {logs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ScrollText className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              No log entries found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} logs
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogRow component
// ---------------------------------------------------------------------------

function LogRow({ log }: { readonly log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata =
    log.metadata && typeof log.metadata === "object" && Object.keys(log.metadata).length > 0;

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => hasMetadata && setExpanded(!expanded)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50",
          hasMetadata && "cursor-pointer",
          !hasMetadata && "cursor-default",
        )}
      >
        {/* Expand arrow */}
        <span className="mt-0.5 w-4 shrink-0 text-muted-foreground">
          {hasMetadata ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : null}
        </span>

        {/* Timestamp */}
        <span className="shrink-0 font-mono text-xs text-muted-foreground w-36">
          {formatTimestamp(log.created_at)}
        </span>

        {/* Level badge */}
        <LevelBadge level={log.level} />

        {/* Category badge */}
        <CategoryBadge category={log.category} />

        {/* Message */}
        <span className="flex-1 text-sm font-mono truncate">{log.message}</span>
      </button>

      {/* Expanded metadata */}
      {expanded && hasMetadata && (
        <div className="mx-4 mb-3 ml-[4.25rem] rounded-md bg-muted/50 border p-3">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level badge
// ---------------------------------------------------------------------------

function LevelBadge({ level }: { readonly level: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    debug: {
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: <Bug className="h-2.5 w-2.5" />,
    },
    info: {
      className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      icon: <Info className="h-2.5 w-2.5" />,
    },
    warn: {
      className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      icon: <AlertTriangle className="h-2.5 w-2.5" />,
    },
    error: {
      className: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: <AlertCircle className="h-2.5 w-2.5" />,
    },
  };

  const c = config[level] ?? config.info;

  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 gap-1 text-[10px] uppercase font-mono w-16 justify-center", c.className)}
    >
      {c.icon}
      {level}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Category badge
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { readonly category: string }) {
  const config: Record<string, string> = {
    auth: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    api: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    system: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-[10px] uppercase font-mono w-16 justify-center",
        config[category] ?? config.system,
      )}
    >
      {category}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Stat badge
// ---------------------------------------------------------------------------

function StatBadge({
  label,
  count,
  icon,
  variant,
}: {
  readonly label: string;
  readonly count: number;
  readonly icon: React.ReactNode;
  readonly variant?: "info" | "warn" | "error";
}) {
  const variantClasses: Record<string, string> = {
    info: "border-gray-500/20",
    warn: "border-yellow-500/30 text-yellow-500",
    error: "border-red-500/30 text-red-500",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 text-xs font-mono py-1 px-2.5",
        variant && variantClasses[variant],
      )}
    >
      {icon}
      {label}: {count.toLocaleString()}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Select filter (native <select> for simplicity)
// ---------------------------------------------------------------------------

function SelectFilter({
  value,
  onChange,
  options,
  placeholder,
  labels,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly string[];
  readonly placeholder: string;
  readonly labels: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-md border border-input bg-background px-2.5 text-xs",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        "appearance-none cursor-pointer",
      )}
      title={placeholder}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels[opt] ?? opt}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${month} ${day}, ${hours}:${minutes}:${seconds}.${ms}`;
}
