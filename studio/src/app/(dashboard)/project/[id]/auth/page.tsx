"use client";

import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "@/components/studio/auth/users-tab";
import { SettingsTab } from "@/components/studio/auth/settings-tab";

export default function AuthPage() {
  const { id: projectId } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Authentication
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, providers, and auth settings
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
