"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectWithStats, ApiResponse } from "@/lib/types";

/**
 * Hook to fetch and manage the project list.
 */
export function useProjects() {
  const [projects, setProjects] = useState<readonly ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/projects");
      const json = (await res.json()) as ApiResponse<ProjectWithStats[]>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch projects");
        return;
      }
      setProjects(json.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects } as const;
}
