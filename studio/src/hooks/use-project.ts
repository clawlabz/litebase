"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectWithStats, ApiResponse } from "@/lib/types";

/**
 * Hook to fetch a single project by ID.
 */
export function useProject(id: string) {
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${id}`);
      const json = (await res.json()) as ApiResponse<ProjectWithStats>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch project");
        return;
      }
      setProject(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProject();
  }, [fetchProject]);

  return { project, loading, error, refetch: fetchProject } as const;
}
