"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LanguageTabs } from "./language-tabs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Column {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly default_value: string | null;
  readonly is_primary: boolean;
}

interface TableSectionProps {
  readonly tableName: string;
  readonly columns: readonly Column[];
  readonly description: string | null;
  readonly apiUrl: string;
  readonly anonKey: string;
}

// ---------------------------------------------------------------------------
// Code generation helpers
// ---------------------------------------------------------------------------

function buildExamples(
  tableName: string,
  apiUrl: string,
  anonKey: string,
  columns: readonly Column[],
) {
  const primaryCol = columns.find((c) => c.is_primary);
  const pkName = primaryCol?.name ?? "id";
  const sampleCol = columns.find((c) => !c.is_primary)?.name ?? pkName;

  const readAll = {
    title: "Read all rows",
    examples: [
      {
        label: "cURL",
        language: "bash",
        code: `curl '${apiUrl}/rest/v1/${tableName}?select=*' \\\n  -H "apikey: ${anonKey}" \\\n  -H "Authorization: Bearer ${anonKey}"`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const { data, error } = await supabase\n  .from('${tableName}')\n  .select('*')`,
      },
      {
        label: "Python",
        language: "python",
        code: `response = supabase.table("${tableName}").select("*").execute()`,
      },
    ],
  };

  const readFilter = {
    title: "Read with filter",
    examples: [
      {
        label: "cURL",
        language: "bash",
        code: `curl '${apiUrl}/rest/v1/${tableName}?${sampleCol}=eq.value&select=*' \\\n  -H "apikey: ${anonKey}" \\\n  -H "Authorization: Bearer ${anonKey}"`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const { data, error } = await supabase\n  .from('${tableName}')\n  .select('*')\n  .eq('${sampleCol}', 'value')`,
      },
      {
        label: "Python",
        language: "python",
        code: `response = supabase.table("${tableName}").select("*").eq("${sampleCol}", "value").execute()`,
      },
    ],
  };

  const insertFields = columns
    .filter((c) => !c.is_primary || c.default_value === null)
    .filter((c) => c.default_value === null || !c.default_value.startsWith("nextval"))
    .slice(0, 3);
  const insertObj = insertFields
    .map((c) => `  "${c.name}": "value"`)
    .join(",\n");
  const insertJsObj = insertFields
    .map((c) => `    ${c.name}: 'value'`)
    .join(",\n");

  const insert = {
    title: "Insert a row",
    examples: [
      {
        label: "cURL",
        language: "bash",
        code: `curl '${apiUrl}/rest/v1/${tableName}' \\\n  -X POST \\\n  -H "apikey: ${anonKey}" \\\n  -H "Authorization: Bearer ${anonKey}" \\\n  -H "Content-Type: application/json" \\\n  -H "Prefer: return=minimal" \\\n  -d '{\n${insertObj}\n}'`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const { data, error } = await supabase\n  .from('${tableName}')\n  .insert({\n${insertJsObj}\n  })`,
      },
      {
        label: "Python",
        language: "python",
        code: `response = supabase.table("${tableName}").insert({\n${insertFields.map((c) => `    "${c.name}": "value"`).join(",\n")}\n}).execute()`,
      },
    ],
  };

  const update = {
    title: "Update rows",
    examples: [
      {
        label: "cURL",
        language: "bash",
        code: `curl '${apiUrl}/rest/v1/${tableName}?${pkName}=eq.1' \\\n  -X PATCH \\\n  -H "apikey: ${anonKey}" \\\n  -H "Authorization: Bearer ${anonKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "${sampleCol}": "new_value" }'`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const { data, error } = await supabase\n  .from('${tableName}')\n  .update({ ${sampleCol}: 'new_value' })\n  .eq('${pkName}', 1)`,
      },
      {
        label: "Python",
        language: "python",
        code: `response = supabase.table("${tableName}").update({\n    "${sampleCol}": "new_value"\n}).eq("${pkName}", "1").execute()`,
      },
    ],
  };

  const deleteOp = {
    title: "Delete rows",
    examples: [
      {
        label: "cURL",
        language: "bash",
        code: `curl '${apiUrl}/rest/v1/${tableName}?${pkName}=eq.1' \\\n  -X DELETE \\\n  -H "apikey: ${anonKey}" \\\n  -H "Authorization: Bearer ${anonKey}"`,
      },
      {
        label: "JavaScript",
        language: "javascript",
        code: `const { data, error } = await supabase\n  .from('${tableName}')\n  .delete()\n  .eq('${pkName}', 1)`,
      },
      {
        label: "Python",
        language: "python",
        code: `response = supabase.table("${tableName}").delete().eq("${pkName}", "1").execute()`,
      },
    ],
  };

  return [readAll, readFilter, insert, update, deleteOp];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableSection({
  tableName,
  columns,
  description,
  apiUrl,
  anonKey,
}: TableSectionProps) {
  const endpoints = buildExamples(tableName, apiUrl, anonKey, columns);

  return (
    <section id={`table-${tableName}`} className="scroll-mt-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight font-mono">
            {tableName}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Column schema table */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Column</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Nullable</TableHead>
                <TableHead className="text-xs">Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-mono text-xs">
                    {col.name}
                    {col.is_primary && (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[9px] px-1.5 py-0"
                      >
                        PK
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {col.type}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {col.nullable ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                    {col.default_value ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Endpoints */}
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <div key={ep.title} className="space-y-2">
              <h3 className="text-sm font-medium">{ep.title}</h3>
              <LanguageTabs examples={ep.examples} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
