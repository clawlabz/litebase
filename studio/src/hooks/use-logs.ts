"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogEntry {
  readonly id: string;
  readonly level: string;
  readonly category: string;
  readonly message: string;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
}

export interface LogStats {
  readonly byLevel: {
    readonly debug: number;
    readonly info: number;
    readonly warn: number;
    readonly error: number;
  };
  readonly byCategory: {
    readonly auth: number;
    readonly api: number;
    readonly system: number;
  };
  readonly recentErrors: number;
  readonly total: number;
}

export interface LogFilters {
  readonly category: string;
  readonly level: string;
  readonly search: string;
  readonly from: string;
  readonly to: string;
}

interface LogsApiResponse {
  readonly logs: readonly LogEntry[];
  readonly totalCount: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLogs(projectId: string) {
  const [logs, setLogs] = useState<readonly LogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [filters, setFilters] = useState<LogFilters>({
    category: "",
    level: "",
    search: "",
    from: "",
    to: "",
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Fetch logs
  // -------------------------------------------------------------------------

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (filters.category) params.set("category", filters.category);
      if (filters.level) params.set("level", filters.level);
      if (filters.search) params.set("search", filters.search);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await fetch(
        `/api/studio/projects/${projectId}/logs?${params.toString()}`,
      );
      const json = (await res.json()) as ApiResponse<LogsApiResponse>;

      if (json.success && json.data) {
        setLogs(json.data.logs);
        setTotalCount(json.data.totalCount);
      }
    } catch {
      // Silently ignore fetch errors for logs
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, filters]);

  // -------------------------------------------------------------------------
  // Fetch stats
  // -------------------------------------------------------------------------

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/logs/stats`,
      );
      const json = (await res.json()) as ApiResponse<LogStats>;

      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch {
      // Silently ignore
    }
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Refresh both
  // -------------------------------------------------------------------------

  const refresh = useCallback(() => {
    void fetchLogs();
    void fetchStats();
  }, [fetchLogs, fetchStats]);

  // -------------------------------------------------------------------------
  // Update a single filter field (immutable)
  // -------------------------------------------------------------------------

  const updateFilter = useCallback(
    <K extends keyof LogFilters>(key: K, value: LogFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Initial load + refetch on filter/page change
  // -------------------------------------------------------------------------

  useEffect(() => {
    void fetchLogs();
    void fetchStats();
  }, [fetchLogs, fetchStats]);

  // -------------------------------------------------------------------------
  // Auto-refresh interval
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        void fetchLogs();
        void fetchStats();
      }, 5_000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchLogs, fetchStats]);

  return {
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
  } as const;
}
