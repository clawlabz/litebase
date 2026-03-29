import { Table2 } from "lucide-react";

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Table Editor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your database tables and schemas
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24">
        <Table2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          No tables yet. Create your first table to get started.
        </p>
      </div>
    </div>
  );
}
