-- Migration: External API Changes Monitoring
-- Tabelle für externe API-Änderungen (Meta/WhatsApp, Payment Providers, etc.)

CREATE TABLE IF NOT EXISTS external_api_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('api_update', 'breaking_change', 'deprecation', 'version_update', 'webhook_change')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'in_progress', 'updated', 'failed')),
  auto_updated BOOLEAN NOT NULL DEFAULT FALSE,
  affected_services TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_external_api_changes_provider ON external_api_changes(provider);
CREATE INDEX IF NOT EXISTS idx_external_api_changes_status ON external_api_changes(status);
CREATE INDEX IF NOT EXISTS idx_external_api_changes_impact ON external_api_changes(impact);
CREATE INDEX IF NOT EXISTS idx_external_api_changes_detected_at ON external_api_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_api_changes_provider_status ON external_api_changes(provider, status);

-- RLS Policies (nur für interne Nutzer)
ALTER TABLE external_api_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Nur Service Role kann schreiben
CREATE POLICY "Service role can manage external_api_changes"
  ON external_api_changes
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Authentifizierte Nutzer können lesen (für /intern Dashboard)
CREATE POLICY "Authenticated users can read external_api_changes"
  ON external_api_changes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Kommentare
COMMENT ON TABLE external_api_changes IS 'Tracks external API/provider changes detected by monitoring system';
COMMENT ON COLUMN external_api_changes.provider IS 'Provider name (e.g., Meta/WhatsApp, Stripe, PayPal, etc.)';
COMMENT ON COLUMN external_api_changes.change_type IS 'Type of change: api_update, breaking_change, deprecation, version_update, webhook_change';
COMMENT ON COLUMN external_api_changes.impact IS 'Impact level: low, medium, high, critical';
COMMENT ON COLUMN external_api_changes.status IS 'Status: detected, in_progress, updated, failed';
COMMENT ON COLUMN external_api_changes.auto_updated IS 'Whether the change was automatically updated';
COMMENT ON COLUMN external_api_changes.affected_services IS 'Array of affected service names';
COMMENT ON COLUMN external_api_changes.metadata IS 'Additional metadata about the change';

