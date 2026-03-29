"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ApiResponse,
  PaginatedRows,
  TableSchema,
  ColumnInfo,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// useTableSchema — fetch column + index info
// ---------------------------------------------------------------------------

export function useTableSchema(projectId: string, tableName: string | null) {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    if (!tableName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/tables/${tableName}`,
      );
      const json = (await res.json()) as ApiResponse<TableSchema>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch schema");
        return;
      }
      setSchema(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId, tableName]);

  useEffect(() => {
    void fetchSchema();
  }, [fetchSchema]);

  return { schema, loading, error, refetch: fetchSchema } as const;
}

// ---------------------------------------------------------------------------
// useTableRows — fetch paginated rows with sorting + CRUD
// ---------------------------------------------------------------------------

interface UseTableRowsOptions {
  readonly projectId: string;
  readonly tableName: string | null;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: string | null;
  readonly order?: "asc" | "desc";
}

export function useTableRows({
  projectId,
  tableName,
  page = 1,
  pageSize = 50,
  sort = null,
  order = "asc",
}: UseTableRowsOptions) {
  const [data, setData] = useState<PaginatedRows | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!tableName) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (sort) {
        params.set("sort", sort);
        params.set("order", order);
      }
      const res = await fetch(
        `/api/studio/projects/${projectId}/tables/${tableName}/rows?${params}`,
      );
      const json = (await res.json()) as ApiResponse<PaginatedRows>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch rows");
        return;
      }
      setData(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId, tableName, page, pageSize, sort, order]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  // Insert a new row
  const insertRow = useCallback(
    async (rowData: Record<string, unknown>): Promise<boolean> => {
      if (!tableName) return false;
      try {
        const res = await fetch(
          `/api/studio/projects/${projectId}/tables/${tableName}/rows`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: rowData }),
          },
        );
        const json = (await res.json()) as ApiResponse;
        if (!json.success) {
          setError(json.error ?? "Failed to insert row");
          return false;
        }
        await fetchRows();
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
        return false;
      }
    },
    [projectId, tableName, fetchRows],
  );

  // Update a row
  const updateRow = useCallback(
    async (
      primaryKey: { column: string; value: unknown },
      rowData: Record<string, unknown>,
    ): Promise<boolean> => {
      if (!tableName) return false;
      try {
        const res = await fetch(
          `/api/studio/projects/${projectId}/tables/${tableName}/rows`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ primaryKey, data: rowData }),
          },
        );
        const json = (await res.json()) as ApiResponse;
        if (!json.success) {
          setError(json.error ?? "Failed to update row");
          return false;
        }
        await fetchRows();
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
        return false;
      }
    },
    [projectId, tableName, fetchRows],
  );

  // Delete rows
  const deleteRows = useCallback(
    async (
      primaryKeys: ReadonlyArray<{ column: string; value: unknown }>,
    ): Promise<boolean> => {
      if (!tableName) return false;
      try {
        const res = await fetch(
          `/api/studio/projects/${projectId}/tables/${tableName}/rows`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ primaryKey: primaryKeys }),
          },
        );
        const json = (await res.json()) as ApiResponse;
        if (!json.success) {
          setError(json.error ?? "Failed to delete rows");
          return false;
        }
        await fetchRows();
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
        return false;
      }
    },
    [projectId, tableName, fetchRows],
  );

  return {
    data,
    loading,
    error,
    refetch: fetchRows,
    insertRow,
    updateRow,
    deleteRows,
  } as const;
}

// ---------------------------------------------------------------------------
// Helper: find primary key column from schema
// ---------------------------------------------------------------------------

export function findPrimaryKeyColumn(
  columns: readonly ColumnInfo[],
): ColumnInfo | null {
  return columns.find((c) => c.is_primary_key) ?? null;
}
