"use client";

import { useParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Save,
  Loader2,
  Clock,
  AlertCircle,
  Trash2,
  TableIcon,
  History,
  Bookmark,
  Database,
} from "lucide-react";
import {
  useSqlEditor,
  type QueryHistoryItem,
  type SavedQueryItem,
} from "@/hooks/use-sql-editor";

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type ResultTab = "results" | "history" | "saved";

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SqlEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    sql,
    setSql,
    result,
    loading,
    error,
    history,
    savedQueries,
    tableNames,
    executeQuery,
    saveQuery,
    deleteSaved,
    loadFromHistory,
    loadSaved,
  } = useSqlEditor(id);

  const [activeTab, setActiveTab] = useState<ResultTab>("results");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  // -------------------------------------------------------------------------
  // Monaco mount handler
  // -------------------------------------------------------------------------

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Ctrl/Cmd+Enter to run query
      editor.addAction({
        id: "run-query",
        label: "Run Query",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          executeQuery();
        },
      });

      // Register SQL completions for table names
      if (tableNames.length > 0) {
        monaco.languages.registerCompletionItemProvider("sql", {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provideCompletionItems: (_model: any, position: any) => {
            const word = _model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions = tableNames.map((name) => ({
              label: name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: name,
              range,
              detail: "Table",
            }));

            return { suggestions };
          },
        });
      }
    },
    [executeQuery, tableNames],
  );

  // Update completion provider when tableNames change
  useEffect(() => {
    // Completion provider is registered on mount; re-mount is rare
    // so this is just for the initial load
  }, [tableNames]);

  // -------------------------------------------------------------------------
  // Save query handler
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    const ok = await saveQuery(saveName.trim(), saveDescription.trim() || undefined);
    setSaving(false);
    if (ok) {
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      setActiveTab("saved");
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1 py-2">
        <Button
          size="sm"
          onClick={() => executeQuery()}
          disabled={loading || !sql.trim()}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          disabled={!sql.trim()}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Save Query
        </Button>

        <div className="flex-1" />

        {result && (
          <Badge variant="secondary" className="gap-1.5 text-xs font-mono">
            <Clock className="h-3 w-3" />
            {result.duration_ms}ms
          </Badge>
        )}

        {result && (
          <Badge variant="secondary" className="gap-1.5 text-xs font-mono">
            <Database className="h-3 w-3" />
            {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
            {result.limited ? " (limited to 1000)" : ""}
          </Badge>
        )}

        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Ctrl+Enter to run
        </Badge>
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-[5] border rounded-md overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={sql}
          onChange={(value) => setSql(value ?? "")}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 8, bottom: 8 },
            automaticLayout: true,
            tabSize: 2,
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>

      <Separator />

      {/* Results panel */}
      <div className="min-h-0 flex-[4] flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ResultTab)}
          className="flex flex-col min-h-0 flex-1"
        >
          <TabsList className="w-fit mx-1 mt-1">
            <TabsTrigger value="results" className="gap-1.5 text-xs">
              <TableIcon className="h-3 w-3" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <History className="h-3 w-3" />
              History
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 text-xs">
              <Bookmark className="h-3 w-3" />
              Saved
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto px-1 py-2">
            {activeTab === "results" && (
              <ResultsPanel result={result} error={error} loading={loading} />
            )}
            {activeTab === "history" && (
              <HistoryPanel
                history={history}
                onLoad={loadFromHistory}
              />
            )}
            {activeTab === "saved" && (
              <SavedPanel
                savedQueries={savedQueries}
                onLoad={loadSaved}
                onDelete={deleteSaved}
              />
            )}
          </div>
        </Tabs>
      </div>

      {/* Save dialog */}
      <SaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        name={saveName}
        onNameChange={setSaveName}
        description={saveDescription}
        onDescriptionChange={setSaveDescription}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results Panel
// ---------------------------------------------------------------------------

function ResultsPanel({
  result,
  error,
  loading,
}: {
  readonly result: ReturnType<typeof useSqlEditor>["result"];
  readonly error: string | null;
  readonly loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Executing query...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
          <div className="text-sm text-destructive font-mono whitespace-pre-wrap">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Database className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">Run a query to see results</p>
      </div>
    );
  }

  // Non-SELECT queries (INSERT, UPDATE, DELETE)
  if (result.columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">
          Query executed successfully. {result.rowCount} row
          {result.rowCount !== 1 ? "s" : ""} affected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-auto max-h-full">
      <Table>
        <TableHeader>
          <TableRow>
            {result.columns.map((col) => (
              <TableHead
                key={col}
                className="text-xs font-semibold whitespace-nowrap"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={result.columns.length}
                className="text-center text-sm text-muted-foreground py-8"
              >
                No rows returned
              </TableCell>
            </TableRow>
          ) : (
            result.rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell
                    key={j}
                    className="text-xs font-mono whitespace-nowrap max-w-[300px] truncate"
                  >
                    {formatCell(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Panel
// ---------------------------------------------------------------------------

function HistoryPanel({
  history,
  onLoad,
}: {
  readonly history: QueryHistoryItem[];
  readonly onLoad: (item: QueryHistoryItem) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">No query history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onLoad(item)}
          className="w-full text-left rounded-md border px-3 py-2 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs font-mono">
              {item.sql}
            </code>
            {item.error ? (
              <Badge variant="destructive" className="text-[10px] shrink-0">
                Error
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {item.row_count} rows
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground shrink-0">
              {item.duration_ms}ms
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {new Date(item.created_at).toLocaleString()}
          </p>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved Panel
// ---------------------------------------------------------------------------

function SavedPanel({
  savedQueries,
  onLoad,
  onDelete,
}: {
  readonly savedQueries: SavedQueryItem[];
  readonly onLoad: (item: SavedQueryItem) => void;
  readonly onDelete: (id: string) => Promise<boolean | undefined>;
}) {
  if (savedQueries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bookmark className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">No saved queries</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {savedQueries.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-md border px-3 py-2 hover:bg-accent transition-colors"
        >
          <button
            type="button"
            onClick={() => onLoad(item)}
            className="flex-1 text-left min-w-0"
          >
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {item.description}
              </p>
            )}
            <code className="mt-1 block truncate text-[11px] font-mono text-muted-foreground">
              {item.sql}
            </code>
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save Dialog
// ---------------------------------------------------------------------------

function SaveDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onSave,
  saving,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly name: string;
  readonly onNameChange: (name: string) => void;
  readonly description: string;
  readonly onDescriptionChange: (desc: string) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Query</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="query-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="query-name"
              placeholder="My query"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="query-desc" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="query-desc"
              placeholder="What does this query do?"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={onSave}
            disabled={!name.trim() || saving}
          >
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
