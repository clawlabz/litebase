"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiResponse, AuthSettings } from "@/lib/types";

export function useAuthSettings(projectId: string) {
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/settings`,
      );
      const json = (await res.json()) as ApiResponse<AuthSettings>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch auth settings");
        return;
      }
      setSettings(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, refetch: fetchSettings } as const;
}
