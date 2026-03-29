-- =============================================================================
-- LiteBase Meta Database Initialization
-- Runs once on first postgres startup via docker-entrypoint-initdb.d
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- LiteBase metadata schema
CREATE SCHEMA IF NOT EXISTS litebase;

-- =============================================================================
-- Projects
-- =============================================================================
CREATE TABLE litebase.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  database_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('creating', 'active', 'paused', 'deleting', 'error')),
  region TEXT NOT NULL DEFAULT 'local',

  -- Service ports (dynamically assigned)
  gotrue_port INTEGER,
  postgrest_port INTEGER,
  gotrue_container_id TEXT,
  postgrest_container_id TEXT,

  -- JWT keys (generated per project)
  jwt_secret TEXT NOT NULL,
  anon_key TEXT NOT NULL,
  service_role_key TEXT NOT NULL,

  -- SMTP config (per-project override, nullable = use global)
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_from TEXT,
  smtp_from_name TEXT,

  -- Auth settings
  auth_enable_signup BOOLEAN NOT NULL DEFAULT true,
  auth_autoconfirm BOOLEAN NOT NULL DEFAULT false,
  auth_jwt_expiry INTEGER NOT NULL DEFAULT 3600,
  auth_redirect_urls TEXT[] NOT NULL DEFAULT '{}',

  -- Stats cache
  db_size_bytes BIGINT DEFAULT 0,
  table_count INTEGER DEFAULT 0,
  user_count INTEGER DEFAULT 0,

  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Saved SQL Queries
-- =============================================================================
CREATE TABLE litebase.saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES litebase.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sql TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_queries_project ON litebase.saved_queries(project_id);

-- =============================================================================
-- Query History
-- =============================================================================
CREATE TABLE litebase.query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES litebase.projects(id) ON DELETE CASCADE,
  sql TEXT NOT NULL,
  duration_ms INTEGER,
  row_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_query_history_project ON litebase.query_history(project_id, created_at DESC);

-- Auto-cleanup: keep last 500 per project
CREATE OR REPLACE FUNCTION litebase.cleanup_query_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM litebase.query_history
  WHERE project_id = NEW.project_id
    AND id NOT IN (
      SELECT id FROM litebase.query_history
      WHERE project_id = NEW.project_id
      ORDER BY created_at DESC
      LIMIT 500
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_query_history
  AFTER INSERT ON litebase.query_history
  FOR EACH ROW
  EXECUTE FUNCTION litebase.cleanup_query_history();

-- =============================================================================
-- Email Templates (per project)
-- =============================================================================
CREATE TABLE litebase.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES litebase.projects(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL
    CHECK (template_type IN ('confirmation', 'recovery', 'magic_link', 'invite')),
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, template_type)
);

-- =============================================================================
-- Roles needed for PostgREST (created once, shared across project databases)
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- =============================================================================
-- Updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION litebase.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON litebase.projects
  FOR EACH ROW EXECUTE FUNCTION litebase.set_updated_at();

CREATE TRIGGER trg_saved_queries_updated_at
  BEFORE UPDATE ON litebase.saved_queries
  FOR EACH ROW EXECUTE FUNCTION litebase.set_updated_at();

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON litebase.email_templates
  FOR EACH ROW EXECUTE FUNCTION litebase.set_updated_at();
