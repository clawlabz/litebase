// ---------------------------------------------------------------------------
// Shared types for the LiteBase Studio project management system
// ---------------------------------------------------------------------------

export type ProjectStatus = "active" | "paused" | "inactive";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly display_name: string;
  readonly db_name: string;
  readonly jwt_secret: string;
  readonly anon_key: string;
  readonly service_role_key: string;
  readonly gotrue_container_id: string | null;
  readonly postgrest_container_id: string | null;
  readonly gotrue_port: number;
  readonly postgrest_port: number;
  readonly status: ProjectStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ProjectWithStats extends Project {
  readonly table_count: number;
  readonly user_count: number;
  readonly db_size: string;
  readonly gotrue_status: "running" | "stopped" | "not_found";
  readonly postgrest_status: "running" | "stopped" | "not_found";
}

export interface CreateProjectRequest {
  readonly name: string;
  readonly displayName: string;
}

export interface UpdateProjectRequest {
  readonly display_name?: string;
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Table Editor types
// ---------------------------------------------------------------------------

export interface TableInfo {
  readonly name: string;
  readonly schema: string;
  readonly row_count_estimate: number;
  readonly size_bytes: number;
  readonly size_pretty: string;
}

export interface ColumnInfo {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly default_value: string | null;
  readonly is_primary_key: boolean;
  readonly foreign_key_ref: string | null;
}

export interface IndexInfo {
  readonly name: string;
  readonly columns: readonly string[];
  readonly is_unique: boolean;
  readonly is_primary: boolean;
}

export interface TableSchema {
  readonly columns: readonly ColumnInfo[];
  readonly indexes: readonly IndexInfo[];
}

export interface PaginatedRows {
  readonly rows: readonly Record<string, unknown>[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CreateTableColumn {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly defaultValue: string;
  readonly isPrimaryKey: boolean;
}

export interface CreateTableRequest {
  readonly name: string;
  readonly columns: readonly CreateTableColumn[];
}

// ---------------------------------------------------------------------------
// Auth types
// ---------------------------------------------------------------------------

export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
  readonly created_at: string;
  readonly last_sign_in_at: string | null;
  readonly email_confirmed_at: string | null;
  readonly phone: string | null;
  readonly raw_app_meta_data: Record<string, unknown> | null;
  readonly raw_user_meta_data: Record<string, unknown> | null;
  readonly is_super_admin: boolean | null;
  readonly banned_until: string | null;
}

export interface AuthUsersResponse {
  readonly users: readonly AuthUser[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CreateAuthUserRequest {
  readonly email: string;
  readonly password: string;
  readonly email_confirm?: boolean;
}

export interface UpdateAuthUserRequest {
  readonly email?: string;
  readonly user_metadata?: Record<string, unknown>;
  readonly banned_until?: string | null;
}

export interface AuthSettings {
  readonly auth_enable_signup: boolean;
  readonly auth_autoconfirm: boolean;
  readonly auth_jwt_expiry: number;
  readonly auth_redirect_urls: readonly string[];
  readonly smtp_host: string | null;
  readonly smtp_port: number;
  readonly smtp_user: string | null;
  readonly smtp_pass: string | null;
  readonly smtp_from: string | null;
  readonly smtp_from_name: string | null;
}

export interface UpdateAuthSettingsRequest {
  readonly auth_enable_signup?: boolean;
  readonly auth_autoconfirm?: boolean;
  readonly auth_jwt_expiry?: number;
  readonly auth_redirect_urls?: readonly string[];
  readonly smtp_host?: string;
  readonly smtp_port?: number;
  readonly smtp_user?: string;
  readonly smtp_pass?: string;
  readonly smtp_from?: string;
  readonly smtp_from_name?: string;
}
