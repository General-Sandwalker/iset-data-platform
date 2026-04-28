-- Migration: 004_viz_engine_tables
-- Description: Create charts and dashboards tables for visualization engine
-- Created: 2026-04-28

CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  chart_type VARCHAR(50) NOT NULL,
  table_id UUID NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  sql_query TEXT NOT NULL,
  config_json JSONB DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  layout_json JSONB DEFAULT '[]',
  is_public BOOLEAN NOT NULL DEFAULT false,
  published_slug UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 6,
  height INTEGER NOT NULL DEFAULT 4,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charts_table_id ON charts(table_id);
CREATE INDEX IF NOT EXISTS idx_charts_created_by ON charts(created_by);
CREATE INDEX IF NOT EXISTS idx_charts_is_public ON charts(is_public);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboards_published_slug ON dashboards(published_slug) WHERE published_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_charts_dashboard ON dashboard_charts(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_charts_chart ON dashboard_charts(chart_id);
