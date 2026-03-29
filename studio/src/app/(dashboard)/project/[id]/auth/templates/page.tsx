"use client";

import { useParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Save,
  Send,
  RotateCcw,
  Loader2,
  Code2,
  Link,
  Globe,
  Mail,
} from "lucide-react";
import type { ApiResponse } from "@/lib/types";
import type { EmailTemplate, EmailTemplateType } from "@/lib/email-templates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATE_TABS: readonly {
  readonly value: EmailTemplateType;
  readonly label: string;
}[] = [
  { value: "confirmation", label: "Confirmation" },
  { value: "recovery", label: "Recovery" },
  { value: "magic_link", label: "Magic Link" },
  { value: "invite", label: "Invite" },
];

const SAMPLE_VARIABLES: Record<string, string> = {
  "{{ .Token }}": "123456",
  "{{ .ConfirmationURL }}": "https://example.com/auth/v1/verify?token=sample",
  "{{ .SiteURL }}": "https://example.com",
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function EmailTemplatesPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [templates, setTemplates] = useState<Record<EmailTemplateType, EmailTemplate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeType, setActiveType] = useState<EmailTemplateType>("confirmation");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [savedSubject, setSavedSubject] = useState("");
  const [savedHtml, setSavedHtml] = useState("");

  const [saving, setSaving] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  const hasUnsavedChanges = subject !== savedSubject || html !== savedHtml;

  // -------------------------------------------------------------------------
  // Fetch templates
  // -------------------------------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/auth/templates`);
      const json = (await res.json()) as ApiResponse<EmailTemplate[]>;
      if (!json.success || !json.data) {
        setError(json.error ?? "Failed to fetch templates");
        return;
      }

      const map = {} as Record<EmailTemplateType, EmailTemplate>;
      for (const t of json.data) {
        map[t.type] = t;
      }
      setTemplates(map);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  // -------------------------------------------------------------------------
  // Sync editor state when template type or data changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!templates) return;
    const t = templates[activeType];
    if (!t) return;
    setSubject(t.subject);
    setHtml(t.html);
    setSavedSubject(t.subject);
    setSavedHtml(t.html);
  }, [templates, activeType]);

  // -------------------------------------------------------------------------
  // Debounced preview
  // -------------------------------------------------------------------------

  useEffect(() => {
    const timeout = setTimeout(() => {
      let rendered = html;
      for (const [key, value] of Object.entries(SAMPLE_VARIABLES)) {
        rendered = rendered.replace(
          new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value,
        );
      }
      setPreviewHtml(rendered);
    }, 500);

    return () => clearTimeout(timeout);
  }, [html]);

  // -------------------------------------------------------------------------
  // Monaco mount
  // -------------------------------------------------------------------------

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // -------------------------------------------------------------------------
  // Insert variable at cursor
  // -------------------------------------------------------------------------

  const insertVariable = useCallback((variable: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    editor.executeEdits("insert-variable", [
      {
        range: selection,
        text: variable,
      },
    ]);
    editor.focus();
  }, []);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/templates/${activeType}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, html }),
        },
      );
      const json = (await res.json()) as ApiResponse<EmailTemplate>;
      if (json.success && json.data) {
        setSavedSubject(json.data.subject);
        setSavedHtml(json.data.html);
        setTemplates((prev) =>
          prev ? { ...prev, [activeType]: json.data as EmailTemplate } : prev,
        );
      }
    } finally {
      setSaving(false);
    }
  }, [projectId, activeType, subject, html]);

  // -------------------------------------------------------------------------
  // Send test email
  // -------------------------------------------------------------------------

  const handleSendTest = useCallback(async () => {
    if (!sendEmail.includes("@")) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/templates/${activeType}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: sendEmail }),
        },
      );
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        setSendDialogOpen(false);
        setSendEmail("");
      }
    } finally {
      setSending(false);
    }
  }, [projectId, activeType, sendEmail]);

  // -------------------------------------------------------------------------
  // Reset to default
  // -------------------------------------------------------------------------

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/templates/${activeType}/reset`,
        { method: "POST" },
      );
      const json = (await res.json()) as ApiResponse<EmailTemplate>;
      if (json.success && json.data) {
        setSubject(json.data.subject);
        setHtml(json.data.html);
        setSavedSubject(json.data.subject);
        setSavedHtml(json.data.html);
        setTemplates((prev) =>
          prev ? { ...prev, [activeType]: json.data as EmailTemplate } : prev,
        );
      }
    } finally {
      setResetting(false);
      setResetDialogOpen(false);
    }
  }, [projectId, activeType]);

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <div className="flex gap-4">
          <Skeleton className="h-[calc(100vh-14rem)] flex-[6]" />
          <Skeleton className="h-[calc(100vh-14rem)] flex-[4]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Email Templates</h1>
          <p className="text-xs text-muted-foreground">
            Customize authentication email templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSendDialogOpen(true)}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Send Test
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
            {hasUnsavedChanges && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-yellow-400" />
            )}
          </Button>
        </div>
      </div>

      {/* Template type tabs */}
      <Tabs
        value={activeType}
        onValueChange={(v) => setActiveType(v as EmailTemplateType)}
      >
        <TabsList className="w-fit mx-1 mb-2">
          {TEMPLATE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
              <Mail className="h-3 w-3" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Main content: editor + preview */}
      <div className="flex flex-1 min-h-0 gap-4 px-1">
        {/* Left panel: editor */}
        <div className="flex flex-col flex-[6] min-h-0 gap-2">
          {/* Subject line */}
          <div className="space-y-1">
            <label htmlFor="template-subject" className="text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <Input
              id="template-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
            />
          </div>

          {/* Variable toolbar */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Variables:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertVariable("{{ .Token }}")}
              className="h-6 text-[11px] px-2 gap-1 font-mono"
            >
              <Code2 className="h-3 w-3" />
              .Token
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertVariable("{{ .ConfirmationURL }}")}
              className="h-6 text-[11px] px-2 gap-1 font-mono"
            >
              <Link className="h-3 w-3" />
              .ConfirmationURL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertVariable("{{ .SiteURL }}")}
              className="h-6 text-[11px] px-2 gap-1 font-mono"
            >
              <Globe className="h-3 w-3" />
              .SiteURL
            </Button>
          </div>

          {/* Monaco editor */}
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="html"
              value={html}
              onChange={(value) => setHtml(value ?? "")}
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
              }}
            />
          </div>
        </div>

        {/* Right panel: live preview */}
        <div className="flex flex-col flex-[4] min-h-0 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
          </div>
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-[#111111]">
            <iframe
              title="Email template preview"
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              className="h-full w-full border-0"
              style={{ backgroundColor: "#111111" }}
            />
          </div>
        </div>
      </div>

      {/* Send test dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a preview of this template with sample data to the specified email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor="test-email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="test-email"
              type="email"
              placeholder="you@example.com"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleSendTest}
              disabled={!sendEmail.includes("@") || sending}
            >
              {sending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1 h-3.5 w-3.5" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default</DialogTitle>
            <DialogDescription>
              This will discard your custom template and revert to the default LiteBase template for{" "}
              <strong>{TEMPLATE_TABS.find((t) => t.value === activeType)?.label}</strong>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
              )}
              Reset Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
