-- ============================================
-- OBSERVABILITY TABLES
-- - app_audit_log: Functional audit trail (user/system actions)
-- - log_workflow_events: Technical workflow execution metrics
-- ============================================

CREATE TABLE IF NOT EXISTS app_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  request_id TEXT,
  trace_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_audit_log_created_at ON app_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_audit_log_event_type ON app_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_app_audit_log_severity ON app_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_app_audit_log_bot_id ON app_audit_log(bot_id);

ALTER TABLE app_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_audit_log_service_role_policy ON app_audit_log
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================

CREATE TABLE IF NOT EXISTS log_workflow_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_name TEXT NOT NULL,
  span_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  duration_ms INTEGER,
  request_id TEXT,
  trace_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_workflow_events_created_at ON log_workflow_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_workflow_events_workflow ON log_workflow_events(workflow_name);
CREATE INDEX IF NOT EXISTS idx_log_workflow_events_status ON log_workflow_events(status);

ALTER TABLE log_workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY log_workflow_events_service_role_policy ON log_workflow_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


