"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Cell renderer: display values based on column type
// ---------------------------------------------------------------------------

interface CellRendererProps {
  readonly value: unknown;
  readonly type: string;
}

function isJsonType(type: string): boolean {
  return type === "json" || type === "jsonb";
}

function isNumericType(type: string): boolean {
  return (
    type === "int2" ||
    type === "int4" ||
    type === "int8" ||
    type === "float4" ||
    type === "float8" ||
    type === "numeric" ||
    type === "serial" ||
    type === "bigserial"
  );
}

function isBoolType(type: string): boolean {
  return type === "bool";
}

function isTimestampType(type: string): boolean {
  return type === "timestamptz" || type === "timestamp";
}

function isUuidType(type: string): boolean {
  return type === "uuid";
}

function JsonExpandButton({ value }: { readonly value: unknown }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        className="ml-1 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Expand className="h-2.5 w-2.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>JSON Value</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs font-mono">
            {JSON.stringify(value, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CellRenderer({ value, type }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50 italic">NULL</span>;
  }

  // Boolean
  if (isBoolType(type)) {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        readOnly
        className="pointer-events-none h-3.5 w-3.5 rounded border-border"
      />
    );
  }

  // Numeric
  if (isNumericType(type)) {
    return <span className="tabular-nums text-right">{String(value)}</span>;
  }

  // Timestamp
  if (isTimestampType(type)) {
    try {
      const date = new Date(String(value));
      return (
        <span className="text-muted-foreground">
          {date.toLocaleString()}
        </span>
      );
    } catch {
      return <span>{String(value)}</span>;
    }
  }

  // UUID
  if (isUuidType(type)) {
    return <span className="font-mono text-[11px]">{String(value)}</span>;
  }

  // JSON/JSONB
  if (isJsonType(type)) {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    const truncated = str.length > 60 ? `${str.slice(0, 60)}...` : str;
    return (
      <div className="flex items-center">
        <span className="truncate font-mono text-[11px]">{truncated}</span>
        {str.length > 60 && <JsonExpandButton value={value} />}
      </div>
    );
  }

  // Default: text
  return <span className="truncate">{String(value)}</span>;
}
