"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiResponse, AuthUser, AuthUsersResponse } from "@/lib/types";

interface UseAuthUsersOptions {
  readonly projectId: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
}

export function useAuthUsers({
  projectId,
  page = 1,
  pageSize = 50,
  search = "",
}: UseAuthUsersOptions) {
  const [users, setUsers] = useState<readonly AuthUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) {
        params.set("search", search);
      }
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/users?${params.toString()}`,
      );
      const json = (await res.json()) as ApiResponse<AuthUsersResponse>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch users");
        return;
      }
      if (json.data) {
        setUsers(json.data.users);
        setTotalCount(json.data.totalCount);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return { users, totalCount, loading, error, refetch: fetchUsers } as const;
}
