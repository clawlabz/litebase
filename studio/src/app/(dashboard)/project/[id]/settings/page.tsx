"use client";

import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-project";
import { GeneralTab } from "@/components/studio/settings/general-tab";
import { DatabaseTab } from "@/components/studio/settings/database-tab";
import { ConnectionTab } from "@/components/studio/settings/connection-tab";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { project, loading, error, refetch } = useProject(projectId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error ?? "Project not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-[#00ff88]" />
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage project configuration, database, and connection settings
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="connection">Connection</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab project={project} onRefetch={refetch} />
        </TabsContent>

        <TabsContent value="database">
          <DatabaseTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="connection">
          <ConnectionTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
