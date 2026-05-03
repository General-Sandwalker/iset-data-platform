-- =============================================================================
-- 007_performance_indexes.sql
-- Add performance indexes for frequently queried columns
-- =============================================================================

-- Composite index for users login query: WHERE (cin = $1 OR role = $2) AND is_active = true
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Dynamic tables ordering (most queries ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_dynamic_tables_created_at ON dynamic_tables(created_at DESC);

-- Dynamic fields ordering (always queried by table_id + order_index)
CREATE INDEX IF NOT EXISTS idx_dynamic_fields_table_id_order ON dynamic_fields(table_id, order_index);

-- Charts listing by creator (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_charts_created_at ON charts(created_at DESC);

-- Surveys listing by status + date
CREATE INDEX IF NOT EXISTS idx_surveys_status_created ON surveys(status, created_at DESC);

-- Generated reports by template + status
CREATE INDEX IF NOT EXISTS idx_generated_reports_template_status ON generated_reports(template_id, status);

-- Activity logs composite for admin dashboard filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created ON activity_logs(action, created_at DESC);

-- Imports by status + date (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_imports_status_created ON imports(status, created_at DESC);
