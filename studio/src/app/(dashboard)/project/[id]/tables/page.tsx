"use client";

import { useParams } from "next/navigation";
import { useState, useCallback } from "react";
import { useTables } from "@/hooks/use-tables";
import { TableList } from "@/components/studio/table-editor/table-list";
import { TableDataView } from "@/components/studio/table-editor/table-data-view";
import { CreateTableDialog } from "@/components/studio/table-editor/create-table-dialog";

export default function TableEditorPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { tables, loading, error, refetch } = useTables(projectId);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const handleTableCreated = useCallback(() => {
    void refetch();
    setCreateOpen(false);
  }, [refetch]);

  const handleTableDropped = useCallback(() => {
    setSelectedTable(null);
    void refetch();
  }, [refetch]);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Left panel: table list */}
      <TableList
        tables={tables}
        loading={loading}
        error={error}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        onNewTable={() => setCreateOpen(true)}
      />

      {/* Right panel: table data view */}
      <div className="flex-1 overflow-hidden border-l">
        {selectedTable ? (
          <TableDataView
            projectId={projectId}
            tableName={selectedTable}
            onTableDropped={handleTableDropped}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a table to view its data</p>
          </div>
        )}
      </div>

      {/* Create table dialog */}
      <CreateTableDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleTableCreated}
      />
    </div>
  );
}
