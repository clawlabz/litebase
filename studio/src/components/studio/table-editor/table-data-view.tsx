"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useTableSchema, useTableRows, findPrimaryKeyColumn } from "@/hooks/use-table-data";
import { RowsTab } from "@/components/studio/table-editor/rows-tab";
import { SchemaTab } from "@/components/studio/table-editor/schema-tab";
import type { ApiResponse } from "@/lib/types";

interface TableDataViewProps {
  readonly projectId: string;
  readonly tableName: string;
  readonly onTableDropped: () => void;
}

export function TableDataView({
  projectId,
  tableName,
  onTableDropped,
}: TableDataViewProps) {
  const [activeTab, setActiveTab] = useState("rows");
  const [dropOpen, setDropOpen] = useState(false);
  const [dropping, setDropping] = useState(false);

  const {
    schema,
    loading: schemaLoading,
    error: schemaError,
    refetch: refetchSchema,
  } = useTableSchema(projectId, tableName);

  const pkColumn = schema ? findPrimaryKeyColumn(schema.columns) : null;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const {
    data: rowsData,
    loading: rowsLoading,
    error: rowsError,
    refetch: refetchRows,
    insertRow,
    updateRow,
    deleteRows,
  } = useTableRows({
    projectId,
    tableName,
    page,
    pageSize,
    sort: sortColumn,
    order: sortOrder,
  });

  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortColumn],
  );

  const handleDropTable = async () => {
    setDropping(true);
    try {
      const res = await fetch(
        `/api/studio/projects/${projectId}/tables/${tableName}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        onTableDropped();
      }
    } finally {
      setDropping(false);
      setDropOpen(false);
    }
  };

  if (schemaLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="p-4 text-sm text-destructive">{schemaError}</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">{tableName}</h2>
          <p className="text-[10px] text-muted-foreground">
            {schema?.columns.length ?? 0} columns
          </p>
        </div>
        <Button
          variant="destructive"
          size="xs"
          onClick={() => setDropOpen(true)}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Drop Table
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as string)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b px-4">
          <TabsList variant="line">
            <TabsTrigger value="rows">Rows</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rows" className="flex-1 overflow-hidden">
          <RowsTab
            projectId={projectId}
            tableName={tableName}
            columns={schema?.columns ?? []}
            pkColumn={pkColumn}
            data={rowsData}
            loading={rowsLoading}
            error={rowsError}
            page={page}
            pageSize={pageSize}
            sortColumn={sortColumn}
            sortOrder={sortOrder}
            onSort={handleSort}
            onPageChange={setPage}
            onInsertRow={insertRow}
            onUpdateRow={updateRow}
            onDeleteRows={deleteRows}
          />
        </TabsContent>

        <TabsContent value="schema" className="flex-1 overflow-auto">
          <SchemaTab
            projectId={projectId}
            tableName={tableName}
            schema={schema}
            onSchemaChanged={() => {
              void refetchSchema();
              void refetchRows();
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Drop table confirmation */}
      <Dialog open={dropOpen} onOpenChange={setDropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop Table</DialogTitle>
            <DialogDescription>
              This will permanently delete the table{" "}
              <strong>{tableName}</strong> and all its data. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDropTable}
              disabled={dropping}
            >
              {dropping ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Dropping...
                </>
              ) : (
                "Drop Table"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
