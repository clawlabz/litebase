import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your database project settings
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24">
        <Settings className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          Project settings coming soon.
        </p>
      </div>
    </div>
  );
}
