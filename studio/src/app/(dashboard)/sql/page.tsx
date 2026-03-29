import { Terminal } from "lucide-react";

export default function SqlEditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SQL Editor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Write and execute SQL queries against your database
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24">
        <Terminal className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          SQL Editor will be available here with Monaco Editor integration.
        </p>
      </div>
    </div>
  );
}
