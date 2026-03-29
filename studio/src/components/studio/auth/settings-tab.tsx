"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuthSettings } from "@/hooks/use-auth-settings";
import type { ApiResponse, UpdateAuthSettingsRequest } from "@/lib/types";

// ---------------------------------------------------------------------------
// Toggle switch (simple custom component)
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#00ff88]" : "bg-input"
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsTabProps {
  readonly projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsTab({ projectId }: SettingsTabProps) {
  const { settings, loading, error, refetch } = useAuthSettings(projectId);

  // General settings state
  const [enableSignup, setEnableSignup] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [jwtExpiry, setJwtExpiry] = useState("3600");
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalMessage, setGeneralMessage] = useState<string | null>(null);

  // Redirect URLs state
  const [redirectUrls, setRedirectUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [redirectSaving, setRedirectSaving] = useState(false);

  // SMTP state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<string | null>(null);

  // Test email dialog
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Sync settings to local state
  useEffect(() => {
    if (settings) {
      setEnableSignup(settings.auth_enable_signup);
      setAutoConfirm(settings.auth_autoconfirm);
      setJwtExpiry(String(settings.auth_jwt_expiry));
      setRedirectUrls([...settings.auth_redirect_urls]);
      setSmtpHost(settings.smtp_host ?? "");
      setSmtpPort(String(settings.smtp_port));
      setSmtpUser(settings.smtp_user ?? "");
      setSmtpPass(""); // Don't pre-fill masked password
      setSmtpFrom(settings.smtp_from ?? "");
      setSmtpFromName(settings.smtp_from_name ?? "");
    }
  }, [settings]);

  const saveSettings = useCallback(
    async (body: UpdateAuthSettingsRequest) => {
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        throw new Error(json.error ?? "Failed to save settings");
      }
      await refetch();
    },
    [projectId, refetch],
  );

  // General save
  const handleSaveGeneral = async () => {
    setGeneralSaving(true);
    setGeneralMessage(null);
    try {
      await saveSettings({
        auth_enable_signup: enableSignup,
        auth_autoconfirm: autoConfirm,
        auth_jwt_expiry: parseInt(jwtExpiry, 10) || 3600,
      });
      setGeneralMessage("Settings saved");
      setTimeout(() => setGeneralMessage(null), 3000);
    } catch (err: unknown) {
      setGeneralMessage(
        err instanceof Error ? err.message : "Failed to save",
      );
    } finally {
      setGeneralSaving(false);
    }
  };

  // Redirect URLs
  const handleAddUrl = async () => {
    if (!newUrl.trim()) return;
    const updated = [...redirectUrls, newUrl.trim()];
    setRedirectSaving(true);
    try {
      await saveSettings({ auth_redirect_urls: updated });
      setRedirectUrls(updated);
      setNewUrl("");
    } catch {
      // ignore
    } finally {
      setRedirectSaving(false);
    }
  };

  const handleRemoveUrl = async (index: number) => {
    const updated = redirectUrls.filter((_, i) => i !== index);
    setRedirectSaving(true);
    try {
      await saveSettings({ auth_redirect_urls: updated });
      setRedirectUrls(updated);
    } catch {
      // ignore
    } finally {
      setRedirectSaving(false);
    }
  };

  // SMTP save
  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpMessage(null);
    try {
      const body: UpdateAuthSettingsRequest = {
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser,
        smtp_from: smtpFrom,
        smtp_from_name: smtpFromName,
        ...(smtpPass ? { smtp_pass: smtpPass } : {}),
      };
      await saveSettings(body);
      setSmtpMessage("SMTP settings saved. GoTrue container restarted.");
      setTimeout(() => setSmtpMessage(null), 5000);
    } catch (err: unknown) {
      setSmtpMessage(
        err instanceof Error ? err.message : "Failed to save SMTP settings",
      );
    } finally {
      setSmtpSaving(false);
    }
  };

  // Test email
  const handleTestEmail = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/auth/test-smtp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: testTo }),
        },
      );
      const json = (await res.json()) as ApiResponse<{ message: string }>;
      if (json.success) {
        setTestResult("Test email sent successfully!");
      } else {
        setTestResult(json.error ?? "Failed to send test email");
      }
    } catch (err: unknown) {
      setTestResult(err instanceof Error ? err.message : "Network error");
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
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

  const smtpConfigured = Boolean(settings?.smtp_host);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Sign Up</p>
              <p className="text-xs text-muted-foreground">
                Allow new users to sign up
              </p>
            </div>
            <ToggleSwitch
              checked={enableSignup}
              onCheckedChange={setEnableSignup}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-confirm Emails</p>
              <p className="text-xs text-muted-foreground">
                Automatically confirm new user emails
              </p>
            </div>
            <ToggleSwitch
              checked={autoConfirm}
              onCheckedChange={setAutoConfirm}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              JWT Expiry (seconds)
            </label>
            <Input
              type="number"
              min={60}
              max={604800}
              value={jwtExpiry}
              onChange={(e) => setJwtExpiry(e.target.value)}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Between 60 (1 min) and 604800 (7 days)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveGeneral}
              disabled={generalSaving}
            >
              {generalSaving && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Save
            </Button>
            {generalMessage && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-[#00ff88]" />
                {generalMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Redirect URLs */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Redirect URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {redirectUrls.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No redirect URLs configured
            </p>
          ) : (
            <div className="space-y-2">
              {redirectUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <code className="flex-1 text-xs font-mono truncate">
                    {url}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveUrl(idx)}
                    disabled={redirectSaving}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://example.com/callback"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleAddUrl();
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddUrl}
              disabled={redirectSaving || !newUrl.trim()}
            >
              {redirectSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3 w-3" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            SMTP Configuration
          </CardTitle>
          {smtpConfigured ? (
            <Badge
              variant="secondary"
              className="gap-1.5 text-[10px]"
            >
              <Wifi className="h-3 w-3 text-[#00ff88]" />
              Configured
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1.5 text-[10px]"
            >
              <WifiOff className="h-3 w-3 text-zinc-500" />
              Not configured
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Host
              </label>
              <Input
                placeholder="smtp.example.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Port
              </label>
              <Input
                type="number"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Username
              </label>
              <Input
                placeholder="your-smtp-username"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                placeholder={
                  settings?.smtp_pass ? "Leave blank to keep current" : "SMTP password"
                }
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                From Email
              </label>
              <Input
                type="email"
                placeholder="noreply@example.com"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                From Name
              </label>
              <Input
                placeholder="My App"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveSmtp}
              disabled={smtpSaving}
            >
              {smtpSaving && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTestResult(null);
                setTestOpen(true);
              }}
              disabled={!smtpConfigured}
            >
              <Send className="mr-1 h-3 w-3" />
              Test Email
            </Button>
            {smtpMessage && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-[#00ff88]" />
                {smtpMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test email dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify your SMTP configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Recipient Email
              </label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            {testResult && (
              <p className="text-xs text-muted-foreground">{testResult}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleTestEmail}
              disabled={testSending || !testTo}
            >
              {testSending && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
