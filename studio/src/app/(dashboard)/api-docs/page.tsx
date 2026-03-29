import { FileCode2 } from "lucide-react";

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Docs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Auto-generated API documentation for your database
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24">
        <FileCode2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          API documentation will be auto-generated from your schema.
        </p>
      </div>
    </div>
  );
}
