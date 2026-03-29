/**
 * Logs table initialization SQL.
 *
 * Creates the litebase.logs table in the meta database for storing
 * project-level log events (auth, api, system).
 */
export const LOGS_INIT_SQL = `
-- ============================================================
-- Schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS litebase;

-- ============================================================
-- litebase.logs
-- ============================================================
CREATE TABLE IF NOT EXISTS litebase.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  category TEXT NOT NULL CHECK (category IN ('auth', 'api', 'system')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_logs_project_created ON litebase.logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_project_category ON litebase.logs(project_id, category);
CREATE INDEX IF NOT EXISTS idx_logs_project_level ON litebase.logs(project_id, level);

-- ============================================================
-- Auto-cleanup trigger: keep last 10,000 logs per project
-- ============================================================
CREATE OR REPLACE FUNCTION litebase.cleanup_old_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  log_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO log_count
  FROM litebase.logs
  WHERE project_id = NEW.project_id;

  IF log_count > 10000 THEN
    DELETE FROM litebase.logs
    WHERE id IN (
      SELECT id FROM litebase.logs
      WHERE project_id = NEW.project_id
      ORDER BY created_at DESC
      OFFSET 10000
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_old_logs ON litebase.logs;
CREATE TRIGGER trg_cleanup_old_logs
  AFTER INSERT ON litebase.logs
  FOR EACH ROW
  EXECUTE FUNCTION litebase.cleanup_old_logs();
`;
