"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { CodeBlock } from "@/components/studio/api-docs/code-block";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionInfo {
  readonly direct_url: string;
  readonly pooled_url: string;
  readonly api_url: string;
  readonly auth_url: string;
  readonly anon_key: string;
  readonly service_role_key: string;
  readonly jwt_secret: string;
}

interface ConnectionTabProps {
  readonly projectId: string;
}

// ---------------------------------------------------------------------------
// Copy Field with mask support
// ---------------------------------------------------------------------------

function SecretField({
  label,
  value,
  description,
}: {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const masked = value.length > 12
    ? `${value.slice(0, 8)}${"*".repeat(24)}${value.slice(-4)}`
    : "*".repeat(value.length);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {description && (
          <p className="text-[10px] text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-2.5 py-1.5 text-xs font-mono">
          {revealed ? value : masked}
        </code>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setRevealed((prev) => !prev)}
        >
          {revealed ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3 w-3 text-[#00ff88]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

function CopyField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-2.5 py-1.5 text-xs font-mono">
          {value}
        </code>
        <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3 w-3 text-[#00ff88]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConnectionTab({ projectId }: ConnectionTabProps) {
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/database/connections`,
      );
      const json = (await res.json()) as ApiResponse<ConnectionInfo>;
      if (!json.success) {
        setError(json.error ?? "Failed to fetch connections");
        return;
      }
      setInfo(json.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error ?? "Failed to load connection info"}
      </div>
    );
  }

  const usageCode = `import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  '${info.api_url}',
  '${info.anon_key}'
)

// Query data
const { data, error } = await supabase
  .from('your_table')
  .select('*')`;

  return (
    <div className="space-y-6 mt-4">
      {/* Connection Strings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Connection Strings</CardTitle>
          <CardDescription>
            Use these URLs to connect to your project database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Direct Connection" value={info.direct_url} />
          <CopyField label="Pooled Connection (PgBouncer)" value={info.pooled_url} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField label="API URL (PostgREST)" value={info.api_url} />
            <CopyField label="Auth URL (GoTrue)" value={info.auth_url} />
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            Keys for authenticating with the API. Click the eye icon to reveal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SecretField
            label="Anon Key"
            value={info.anon_key}
            description="Safe for client-side use"
          />
          <SecretField
            label="Service Role Key"
            value={info.service_role_key}
            description="Server-side only, bypasses RLS"
          />
          <SecretField
            label="JWT Secret"
            value={info.jwt_secret}
            description="Used for verifying JWTs"
          />
        </CardContent>
      </Card>

      {/* Usage Example */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Quick Start</CardTitle>
          <CardDescription>
            Connect to your project using the Supabase client library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={usageCode} language="javascript" />
        </CardContent>
      </Card>
    </div>
  );
}
