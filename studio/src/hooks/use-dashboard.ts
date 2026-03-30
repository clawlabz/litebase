"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceHealth {
  readonly status: "online" | "offline" | "not_configured";
  readonly latency_ms: number;
}

interface TableStat {
  readonly name: string;
  readonly row_count: number;
  readonly size_bytes: number;
}

interface DatabaseStats {
  readonly size_bytes: number;
  readonly table_count: number;
  readonly total_rows: number;
  readonly active_connections: number;
  readonly tables: readonly TableStat[];
}

interface AuthStats {
  readonly total_users: number;
  readonly confirmed_users: number;
  readonly users_last_24h: number;
  readonly users_last_7d: number;
  readonly recent_signups: readonly { email: string; created_at: string }[];
}

interface ActivityEvent {
  readonly action: string;
  readonly actor_email: string;
  readonly created_at: string;
}

interface ActivityStats {
  readonly events_last_24h: number;
  readonly events_last_7d: number;
  readonly recent_events: readonly ActivityEvent[];
}

export interface DashboardData {
  readonly services: {
    readonly database: ServiceHealth;
    readonly auth: ServiceHealth;
    readonly api: ServiceHealth;
  };
  readonly database: DatabaseStats;
  readonly auth: AuthStats;
  readonly activity: ActivityStats;
}

interface DailyUsage {
  readonly date: string;
  readonly new_users: number;
  readonly total_users: number;
  readonly db_size_bytes: number;
}

export interface UsageData {
  readonly daily: readonly DailyUsage[];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 30_000;

export function useDashboard(projectId: string) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, usageRes] = await Promise.all([
        fetch(`/api/studio/projects/${projectId}/dashboard`),
        fetch(`/api/studio/projects/${projectId}/dashboard/usage`),
      ]);

      const dashJson = (await dashRes.json()) as ApiResponse<DashboardData>;
      const usageJson = (await usageRes.json()) as ApiResponse<UsageData>;

      if (!dashJson.success) {
        setError(dashJson.error ?? "Failed to fetch dashboard");
        return;
      }

      setDashboard(dashJson.data ?? null);
      setUsage(usageJson.data ?? null);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchDashboard();
  }, [fetchDashboard]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    void fetchDashboard();

    intervalRef.current = setInterval(() => {
      void fetchDashboard();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDashboard]);

  return {
    dashboard,
    usage,
    loading,
    error,
    lastUpdated,
    refresh,
  } as const;
}
