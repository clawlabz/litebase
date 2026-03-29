import { ScrollText } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View database query logs and system events
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24">
        <ScrollText className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          Logs viewer coming soon.
        </p>
      </div>
    </div>
  );
}
