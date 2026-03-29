// ---------------------------------------------------------------------------
// Common PostgreSQL column types for the type selector
// ---------------------------------------------------------------------------

export const COLUMN_TYPES = [
  { value: "text", label: "text" },
  { value: "varchar(255)", label: "varchar(255)" },
  { value: "integer", label: "integer" },
  { value: "bigint", label: "bigint" },
  { value: "numeric", label: "numeric" },
  { value: "boolean", label: "boolean" },
  { value: "uuid", label: "uuid" },
  { value: "timestamptz", label: "timestamptz" },
  { value: "timestamp", label: "timestamp" },
  { value: "jsonb", label: "jsonb" },
  { value: "json", label: "json" },
  { value: "serial", label: "serial" },
  { value: "bigserial", label: "bigserial" },
  { value: "smallint", label: "smallint" },
  { value: "real", label: "real" },
  { value: "double precision", label: "double precision" },
  { value: "date", label: "date" },
  { value: "time", label: "time" },
  { value: "bytea", label: "bytea" },
  { value: "inet", label: "inet" },
  { value: "cidr", label: "cidr" },
] as const;
