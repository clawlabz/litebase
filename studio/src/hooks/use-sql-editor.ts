"use client";

import { useState, useCallback, useEffect } from "react";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SqlResult {
  readonly columns: string[];
  readonly rows: unknown[][];
  readonly rowCount: number;
  readonly duration_ms: number;
  readonly limited?: boolean;
}

export interface QueryHistoryItem {
  readonly id: string;
  readonly sql: string;
  readonly duration_ms: number;
  readonly row_count: number;
  readonly error: string | null;
  readonly created_at: string;
}

export interface SavedQueryItem {
  readonly id: string;
  readonly name: string;
  readonly sql: string;
  readonly description: string | null;
  readonly created_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSqlEditor(projectId: string) {
  const [sql, setSql] = useState("SELECT 1;");
  const [result, setResult] = useState<SqlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQueryItem[]>([]);
  const [tableNames, setTableNames] = useState<string[]>([]);

  // -------------------------------------------------------------------------
  // Execute SQL
  // -------------------------------------------------------------------------

  const executeQuery = useCallback(
    async (queryText?: string) => {
      const text = queryText ?? sql;
      if (!text.trim()) return;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await fetch(`/api/studio/projects/${projectId}/sql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: text }),
        });

        const json = (await res.json()) as ApiResponse<SqlResult>;

        if (!json.success) {
          setError(json.error ?? "Query failed");
        } else if (json.data) {
          setResult(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
        // Refresh history after execution
        fetchHistory();
      }
    },
    [sql, projectId],
  );

  // -------------------------------------------------------------------------
  // Fetch history
  // -------------------------------------------------------------------------

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/sql/history`,
      );
      const json = (await res.json()) as ApiResponse<QueryHistoryItem[]>;
      if (json.success && json.data) {
        setHistory(json.data);
      }
    } catch {
      // Silently ignore
    }
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Fetch saved queries
  // -------------------------------------------------------------------------

  const fetchSavedQueries = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/sql/saved`,
      );
      const json = (await res.json()) as ApiResponse<SavedQueryItem[]>;
      if (json.success && json.data) {
        setSavedQueries(json.data);
      }
    } catch {
      // Silently ignore
    }
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Save a query
  // -------------------------------------------------------------------------

  const saveQuery = useCallback(
    async (name: string, description?: string) => {
      if (!sql.trim()) return;

      try {
        const res = await fetch(
          `/api/studio/projects/${projectId}/sql/saved`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, sql, description }),
          },
        );

        const json = (await res.json()) as ApiResponse<SavedQueryItem>;
        if (json.success) {
          await fetchSavedQueries();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [sql, projectId, fetchSavedQueries],
  );

  // -------------------------------------------------------------------------
  // Delete a saved query
  // -------------------------------------------------------------------------

  const deleteSaved = useCallback(
    async (queryId: string) => {
      try {
        const res = await fetch(
          `/api/studio/projects/${projectId}/sql/saved/${queryId}`,
          { method: "DELETE" },
        );

        const json = (await res.json()) as ApiResponse;
        if (json.success) {
          await fetchSavedQueries();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [projectId, fetchSavedQueries],
  );

  // -------------------------------------------------------------------------
  // Load from history or saved
  // -------------------------------------------------------------------------

  const loadFromHistory = useCallback((item: QueryHistoryItem) => {
    setSql(item.sql);
  }, []);

  const loadSaved = useCallback((item: SavedQueryItem) => {
    setSql(item.sql);
  }, []);

  // -------------------------------------------------------------------------
  // Fetch table names for autocomplete
  // -------------------------------------------------------------------------

  const fetchTableNames = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: `SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name`,
        }),
      });

      const json = (await res.json()) as ApiResponse<SqlResult>;
      if (json.success && json.data) {
        const names = json.data.rows.map((row) => String(row[0]));
        setTableNames(names);
      }
    } catch {
      // Silently ignore
    }
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Initial data load
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchHistory();
    fetchSavedQueries();
    fetchTableNames();
  }, [fetchHistory, fetchSavedQueries, fetchTableNames]);

  return {
    sql,
    setSql,
    result,
    loading,
    error,
    history,
    savedQueries,
    tableNames,
    executeQuery,
    saveQuery,
    deleteSaved,
    loadFromHistory,
    loadSaved,
  } as const;
}
