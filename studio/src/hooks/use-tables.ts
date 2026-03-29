"use client";

import { useState, useEffect, useCallback } from "react";
import type { TableInfo, ApiResponse } from "@/lib/types";

/**
 * Hook to fetch the table list for a project.
 */
export function useTables(projectId: string) {
  const [tables, setTables] = useState<readonly TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/tables`);
      const json = (await res.json()) as ApiResponse<TableInfo[]>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch tables");
        return;
      }
      setTables(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTables();
  }, [fetchTables]);

  return { tables, loading, error, refetch: fetchTables } as const;
}
