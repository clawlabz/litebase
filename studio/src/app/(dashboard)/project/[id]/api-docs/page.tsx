"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeBlock } from "@/components/studio/api-docs/code-block";
import { TableSection } from "@/components/studio/api-docs/table-section";
import { FileCode2 } from "lucide-react";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiDocsColumn {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly default_value: string | null;
  readonly is_primary: boolean;
}

interface ApiDocsTable {
  readonly name: string;
  readonly columns: readonly ApiDocsColumn[];
  readonly description: string | null;
}

interface ApiDocsData {
  readonly tables: readonly ApiDocsTable[];
  readonly api_url: string;
  readonly anon_key: string;
  readonly service_role_key: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApiDocsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiDocsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/api-docs`);
      const json = (await res.json()) as ApiResponse<ApiDocsData>;
      if (!json.success) {
        setError(json.error ?? "Failed to load API docs");
        return;
      }
      setData(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error ?? "Failed to load API documentation"}
      </div>
    );
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const initCode = `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = '${data.api_url}'
const supabaseKey = '${data.anon_key}'

const supabase = createClient(supabaseUrl, supabaseKey)`;

  return (
    <div className="flex gap-6">
      {/* Left sidebar - Table of Contents */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-6 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            On this page
          </p>
          <button
            onClick={() => scrollToSection("auth-section")}
            className="block w-full text-left text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
          >
            Authentication
          </button>
          {data.tables.map((t) => (
            <button
              key={t.name}
              onClick={() => scrollToSection(`table-${t.name}`)}
              className="block w-full text-left text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors font-mono"
            >
              {t.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCode2 className="h-5 w-5 text-[#00ff88]" />
            <h1 className="text-2xl font-semibold tracking-tight">
              API Documentation
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Auto-generated REST API documentation for your database tables.
            Use these endpoints with any HTTP client or the Supabase client libraries.
          </p>
        </div>

        {/* Authentication section */}
        <section id="auth-section" className="scroll-mt-6 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Authentication
          </h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium">Anon Key (public)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Safe to use in the browser. Respects Row Level Security (RLS) policies.
                  Use this key for client-side applications.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Service Role Key (secret)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bypasses RLS. Never expose this key in client-side code.
                  Use only in server-side code or secure environments.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">
                Initialize the Supabase Client
              </h3>
              <CodeBlock code={initCode} language="javascript" />
            </div>
          </div>
        </section>

        {/* Per-table sections */}
        {data.tables.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No public tables found. Create a table to see API documentation.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {data.tables.map((table) => (
              <TableSection
                key={table.name}
                tableName={table.name}
                columns={table.columns}
                description={table.description}
                apiUrl={data.api_url}
                anonKey={data.anon_key}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
