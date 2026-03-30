"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  Shield,
  Table2,
  Users,
  Wifi,
  LogIn,
  UserPlus,
  KeyRound,
  Activity,
  Layers,
} from "lucide-react";
import {
  useDashboard,
  formatBytes,
  formatNumber,
  formatRelativeTime,
  type DashboardData,
} from "@/hooks/use-dashboard";

// ---------------------------------------------------------------------------
// Status dot component
// ---------------------------------------------------------------------------

type ServiceStatus = "online" | "offline" | "not_configured";

function StatusDot({ status }: { readonly status: ServiceStatus }) {
  const colorClass =
    status === "online"
      ? "bg-[#00ff88]"
      : status === "not_configured"
        ? "bg-[#eab308]"
        : "bg-[#ef4444]";

  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "online" && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-40"
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  );
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case "online":
      return "Online";
    case "not_configured":
      return "Not Configured";
    case "offline":
      return "Offline";
  }
}

// ---------------------------------------------------------------------------
// Action icon for activity events
// ---------------------------------------------------------------------------

function actionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("login") || lower.includes("sign_in")) {
    return <LogIn className="h-3.5 w-3.5 text-[#00ff88]" />;
  }
  if (lower.includes("signup") || lower.includes("sign_up") || lower.includes("create")) {
    return <UserPlus className="h-3.5 w-3.5 text-sky-400" />;
  }
  if (lower.includes("token") || lower.includes("refresh")) {
    return <KeyRound className="h-3.5 w-3.5 text-amber-400" />;
  }
  return <Activity className="h-3.5 w-3.5 text-zinc-400" />;
}

function formatActionName(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function ServiceCardSkeleton() {
  return (
    <Card className="border-[#333] bg-[#1a1a2e]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card className="border-[#333] bg-[#1a1a2e]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Service Status Cards
// ---------------------------------------------------------------------------

function ServiceCard({
  title,
  icon,
  health,
  detail,
}: {
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly health: DashboardData["services"]["database"];
  readonly detail: string;
}) {
  return (
    <Card className="border-[#333] bg-[#1a1a2e]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2">
          <StatusDot status={health.status} />
          <span className="text-sm font-medium text-zinc-200">
            {statusLabel(health.status)}
          </span>
          {health.status === "online" && (
            <span className="text-xs font-mono text-zinc-500">
              {health.latency_ms}ms
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  title,
  value,
  icon,
  badge,
}: {
  readonly title: string;
  readonly value: string;
  readonly icon: React.ReactNode;
  readonly badge?: string | null;
}) {
  return (
    <Card className="border-[#333] bg-[#1a1a2e]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100">
            {value}
          </span>
          {badge && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-[#00ff88]/10 text-[#00ff88]">
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Usage Chart (pure CSS bars)
// ---------------------------------------------------------------------------

function UsageChart({
  daily,
}: {
  readonly daily: readonly { date: string; new_users: number }[];
}) {
  const maxValue = Math.max(1, ...daily.map((d) => d.new_users));

  return (
    <Card className="border-[#333] bg-[#1a1a2e] flex-1 min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          New Users (Last 14 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 h-40">
          {daily.map((d) => {
            const heightPct = (d.new_users / maxValue) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end h-full group"
              >
                <div className="relative w-full flex justify-center mb-1">
                  <span className="absolute -top-5 text-[9px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.new_users}
                  </span>
                </div>
                <div
                  className="w-full rounded-t-sm transition-all duration-300 ease-out"
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    backgroundColor: d.new_users > 0 ? "#00ff88" : "#333",
                    opacity: d.new_users > 0 ? 0.8 : 0.3,
                    minHeight: "2px",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 mt-2">
          {daily.map((d, i) => (
            <div key={d.date} className="flex-1 text-center">
              {(i === 0 || i === daily.length - 1 || i === Math.floor(daily.length / 2)) && (
                <span className="text-[9px] font-mono text-zinc-600">
                  {d.date.slice(5)}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Activity Feed
// ---------------------------------------------------------------------------

function ActivityFeed({
  events,
}: {
  readonly events: readonly { action: string; actor_email: string; created_at: string }[];
}) {
  return (
    <Card className="border-[#333] bg-[#1a1a2e] w-full lg:w-[40%]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
            <Activity className="h-8 w-8 mb-2" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
            {events.map((event, i) => (
              <div key={`${event.created_at}-${i}`} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {actionIcon(event.action)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-300 truncate">
                    {formatActionName(event.action)}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {event.actor_email}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                  {formatRelativeTime(event.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Table Overview
// ---------------------------------------------------------------------------

function TableOverview({
  tables,
  projectId,
}: {
  readonly tables: readonly { name: string; row_count: number; size_bytes: number }[];
  readonly projectId: string;
}) {
  const router = useRouter();

  return (
    <Card className="border-[#333] bg-[#1a1a2e]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Tables Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
            <Layers className="h-8 w-8 mb-2" />
            <p className="text-sm">No tables found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#333] hover:bg-transparent">
                <TableHead className="text-zinc-500 text-xs">Name</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Rows</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow
                  key={table.name}
                  className="border-[#333] cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() =>
                    router.push(
                      `/project/${projectId}/table-editor?table=${table.name}`,
                    )
                  }
                >
                  <TableCell className="font-mono text-xs text-zinc-300">
                    {table.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-400">
                    {formatNumber(table.row_count)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-400">
                    {formatBytes(table.size_bytes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Last updated display
// ---------------------------------------------------------------------------

function LastUpdated({
  date,
  onRefresh,
  refreshing,
}: {
  readonly date: Date | null;
  readonly onRefresh: () => void;
  readonly refreshing: boolean;
}) {
  const [, setTick] = useState(0);

  // Re-render every 5 seconds to update relative time
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const label = date
    ? `Updated ${formatRelativeTime(date.toISOString())}`
    : "Loading...";

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span className="font-mono">{label}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw
          className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
        />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dashboard, usage, loading, error, lastUpdated, refresh } =
    useDashboard(id);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Loading state
  if (loading && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-64 flex-1 rounded-xl" />
          <Skeleton className="h-64 w-[40%] rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // Error state
  if (error || !dashboard) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to Projects
        </Button>
        <div className="rounded-lg border border-[#ef4444]/50 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#ef4444]">
          {error ?? "Unable to fetch dashboard data"}
        </div>
      </div>
    );
  }

  // Compute change badge for users
  const usersBadge = (() => {
    if (!usage || usage.daily.length < 8) return null;
    const recentWeek = usage.daily.slice(-7);
    const previousWeek = usage.daily.slice(0, 7);
    const recentNew = recentWeek.reduce((s, d) => s + d.new_users, 0);
    const previousNew = previousWeek.reduce((s, d) => s + d.new_users, 0);
    if (previousNew === 0 && recentNew > 0) return `+${recentNew}`;
    if (previousNew === 0) return null;
    const pct = Math.round(((recentNew - previousNew) / previousNew) * 100);
    if (pct === 0) return null;
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Dashboard
          </h1>
        </div>
        <LastUpdated
          date={lastUpdated}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </div>

      {/* Service Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ServiceCard
          title="Database"
          icon={<Database className="h-4 w-4 text-zinc-500" />}
          health={dashboard.services.database}
          detail={formatBytes(dashboard.database.size_bytes)}
        />
        <ServiceCard
          title="Auth (GoTrue)"
          icon={<Shield className="h-4 w-4 text-zinc-500" />}
          health={dashboard.services.auth}
          detail={`${formatNumber(dashboard.auth.total_users)} users`}
        />
        <ServiceCard
          title="API (PostgREST)"
          icon={<Wifi className="h-4 w-4 text-zinc-500" />}
          health={dashboard.services.api}
          detail={`${dashboard.database.table_count} tables`}
        />
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={formatNumber(dashboard.auth.total_users)}
          icon={<Users className="h-4 w-4 text-zinc-500" />}
          badge={usersBadge}
        />
        <MetricCard
          title="Tables"
          value={String(dashboard.database.table_count)}
          icon={<Table2 className="h-4 w-4 text-zinc-500" />}
        />
        <MetricCard
          title="Database Size"
          value={formatBytes(dashboard.database.size_bytes)}
          icon={<HardDrive className="h-4 w-4 text-zinc-500" />}
        />
        <MetricCard
          title="Active Connections"
          value={String(dashboard.database.active_connections)}
          icon={<Layers className="h-4 w-4 text-zinc-500" />}
        />
      </div>

      {/* Middle Row: Chart + Activity */}
      <div className="flex flex-col lg:flex-row gap-4">
        {usage ? (
          <UsageChart daily={usage.daily} />
        ) : (
          <Card className="border-[#333] bg-[#1a1a2e] flex-1 min-w-0">
            <CardContent className="flex items-center justify-center h-52">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            </CardContent>
          </Card>
        )}
        <ActivityFeed events={dashboard.activity.recent_events} />
      </div>

      {/* Table Overview */}
      <TableOverview tables={dashboard.database.tables} projectId={id} />
    </div>
  );
}
