"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthUsers } from "@/hooks/use-auth-users";
import { CreateUserDialog } from "./create-user-dialog";
import { UserDetailSheet } from "./user-detail-sheet";
import type { AuthUser } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function userStatusBadge(user: AuthUser) {
  const isBanned = user.banned_until
    ? new Date(user.banned_until) > new Date()
    : false;

  if (isBanned) {
    return <Badge variant="destructive">Banned</Badge>;
  }
  if (user.email_confirmed_at) {
    return (
      <Badge className="bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20">
        Confirmed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-yellow-500">
      Unconfirmed
    </Badge>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UsersTabProps {
  readonly projectId: string;
}

export function UsersTab({ projectId }: UsersTabProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const pageSize = 50;
  const { users, totalCount, loading, error, refetch } = useAuthUsers({
    projectId,
    page,
    pageSize,
    search,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearch = useCallback(() => {
    setPage(1);
    setSearch(searchInput);
  }, [searchInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleRowClick = useCallback((user: AuthUser) => {
    setSelectedUser(user);
    setSheetOpen(true);
  }, []);

  const handleUpdated = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Create User
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Sign In</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  {search ? "No users match your search" : "No users yet"}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const provider =
                  (user.raw_app_meta_data as Record<string, unknown> | null)
                    ?.provider ?? "email";
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(user)}
                  >
                    <TableCell className="font-medium">
                      {user.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {String(provider)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(user.last_sign_in_at)}
                    </TableCell>
                    <TableCell>{userStatusBadge(user)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {totalCount} user{totalCount !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create user dialog */}
      <CreateUserDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleUpdated}
      />

      {/* User detail sheet */}
      <UserDetailSheet
        projectId={projectId}
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
