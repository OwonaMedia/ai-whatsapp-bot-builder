-- ============================================
-- SECURITY & COMPLIANCE IMPROVEMENTS
-- Based on Expert Reviews
-- ============================================

-- ============================================
-- 1. INPUT VALIDATION CONSTRAINTS
-- ============================================

-- Bots Status Validation
ALTER TABLE bots 
  DROP CONSTRAINT IF EXISTS bots_status_check;

ALTER TABLE bots 
  ADD CONSTRAINT bots_status_check 
  CHECK (status IN ('draft', 'active', 'paused', 'archived'));

-- Conversations Status Validation
ALTER TABLE conversations 
  DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE conversations 
  ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('active', 'blocked', 'deleted'));

-- Conversations Consent Method Validation
ALTER TABLE conversations 
  DROP CONSTRAINT IF EXISTS conversations_consent_method_check;

ALTER TABLE conversations 
  ADD CONSTRAINT conversations_consent_method_check
  CHECK (consent_method IS NULL OR consent_method IN ('opt_in', 'double_opt_in', 'explicit', 'implied'));

-- Messages Direction Validation
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_direction_check;

ALTER TABLE messages 
  ADD CONSTRAINT messages_direction_check
  CHECK (direction IN ('inbound', 'outbound'));

-- Messages Type Validation
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE messages 
  ADD CONSTRAINT messages_type_check
  CHECK (message_type IS NULL OR message_type IN ('text', 'image', 'video', 'document', 'template', 'location', 'audio', 'contacts', 'sticker'));

-- Data Requests Type Validation
ALTER TABLE data_requests 
  DROP CONSTRAINT IF EXISTS data_requests_type_check;

ALTER TABLE data_requests 
  ADD CONSTRAINT data_requests_type_check
  CHECK (request_type IN ('access', 'deletion', 'correction', 'portability', 'restriction', 'objection'));

-- Data Requests Status Validation
ALTER TABLE data_requests 
  DROP CONSTRAINT IF EXISTS data_requests_status_check;

ALTER TABLE data_requests 
  ADD CONSTRAINT data_requests_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled'));

-- Consent Log Action Validation
ALTER TABLE consent_log 
  DROP CONSTRAINT IF EXISTS consent_log_action_check;

ALTER TABLE consent_log 
  ADD CONSTRAINT consent_log_action_check
  CHECK (action IN ('given', 'withdrawn', 'updated', 'expired', 'refreshed'));

-- Bot Flows Status Validation
ALTER TABLE bot_flows 
  DROP CONSTRAINT IF EXISTS bot_flows_active_check;

ALTER TABLE bot_flows 
  ADD CONSTRAINT bot_flows_active_check
  CHECK (is_active IN (true, false));

-- Templates Status Validation
ALTER TABLE templates 
  DROP CONSTRAINT IF EXISTS templates_status_check;

ALTER TABLE templates 
  ADD CONSTRAINT templates_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'draft'));

-- Analytics Metric Type Validation
ALTER TABLE analytics 
  DROP CONSTRAINT IF EXISTS analytics_metric_type_check;

ALTER TABLE analytics 
  ADD CONSTRAINT analytics_metric_type_check
  CHECK (metric_type IN ('messages_sent', 'messages_received', 'conversations', 'conversions', 'active_users', 'response_time', 'satisfaction_score'));

-- ============================================
-- 2. PROCESSING RECORDS (DSGVO Art. 30)
-- ============================================

CREATE TABLE IF NOT EXISTS processing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT[] NOT NULL, -- 'customers', 'employees', 'contacts'
  recipients TEXT[],
  third_countries TEXT[], -- Länder außerhalb EU
  retention_period_days INTEGER,
  security_measures TEXT[],
  automated_decision_making BOOLEAN DEFAULT false,
  profiling BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, purpose)
);

CREATE INDEX idx_processing_records_bot_id ON processing_records(bot_id);
CREATE INDEX idx_processing_records_legal_basis ON processing_records(legal_basis);

ALTER TABLE processing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view processing records of own bots" ON processing_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = processing_records.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. RATE LIMITING SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL, -- 'webhook', 'api', 'message'
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, phone_hash, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_bot_id ON rate_limits(bot_id);
CREATE INDEX idx_rate_limits_phone_hash ON rate_limits(phone_hash);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start, window_end);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Function: Cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_end < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. DATA BREACH NOTIFICATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS data_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('unauthorized_access', 'data_loss', 'data_disclosure', 'system_compromise', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_records INTEGER,
  affected_data_categories TEXT[],
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE, -- 72h Frist für DSGVO Art. 33
  notified_authorities BOOLEAN DEFAULT false,
  notified_data_subjects BOOLEAN DEFAULT false,
  description TEXT NOT NULL,
  root_cause TEXT,
  mitigation_steps TEXT[],
  prevention_measures TEXT[],
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigated', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_breaches_bot_id ON data_breaches(bot_id);
CREATE INDEX idx_data_breaches_severity ON data_breaches(severity);
CREATE INDEX idx_data_breaches_status ON data_breaches(status);
CREATE INDEX idx_data_breaches_discovered_at ON data_breaches(discovered_at);

ALTER TABLE data_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view breaches of own bots" ON data_breaches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = data_breaches.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- Function: Check 72h reporting deadline
CREATE OR REPLACE FUNCTION check_breach_reporting_deadline()
RETURNS TABLE (
  breach_id UUID,
  bot_id UUID,
  hours_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    db.id,
    db.bot_id,
    EXTRACT(EPOCH FROM (db.discovered_at + INTERVAL '72 hours' - NOW())) / 3600 as hours_remaining
  FROM data_breaches db
  WHERE db.status IN ('open', 'investigating')
  AND db.reported_at IS NULL
  AND db.discovered_at + INTERVAL '72 hours' > NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. INTERNATIONAL DATA TRANSFERS TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS data_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  destination_country TEXT NOT NULL,
  data_categories TEXT[] NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('adequacy_decision', 'standard_contractual_clauses', 'binding_corporate_rules', 'certification', 'code_of_conduct', 'other')),
  safeguards TEXT[],
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipient_name TEXT,
  recipient_type TEXT, -- 'processor', 'controller', 'third_party'
  purpose TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_transfers_bot_id ON data_transfers(bot_id);
CREATE INDEX idx_data_transfers_destination ON data_transfers(destination_country);

ALTER TABLE data_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfers of own bots" ON data_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = data_transfers.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. COMPREHENSIVE AUDIT TRAIL IMPROVEMENTS
-- ============================================

-- Add more detailed audit types
ALTER TABLE audit_log 
  DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log 
  ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    -- CRUD Operations
    'create', 'read', 'update', 'delete',
    -- Authentication
    'login', 'logout', 'login_failed', 'password_change',
    -- Authorization
    'permission_granted', 'permission_revoked', 'role_changed',
    -- Data Operations
    'data_exported', 'data_deleted', 'data_anonymized',
    -- Compliance
    'consent_given', 'consent_withdrawn', 'data_request_submitted',
    -- Security
    'security_event', 'vulnerability_detected', 'access_denied',
    -- Configuration
    'config_changed', 'settings_updated', 'integration_added'
  ));

-- Add severity level for security events
ALTER TABLE audit_log 
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IS NULL OR severity IN ('info', 'warning', 'error', 'critical'));

-- Add IP address tracking (anonymized)
ALTER TABLE audit_log 
  ADD COLUMN IF NOT EXISTS ip_address_hash TEXT; -- Hashed for privacy

-- Function: Automatic audit logging for critical operations
CREATE OR REPLACE FUNCTION log_audit_event(
  p_bot_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    bot_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    severity,
    ip_address_hash -- Should be passed from application
  ) VALUES (
    p_bot_id,
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_severity,
    NULL -- Set from application context
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. CONSENT EXPIRY HANDLING
-- ============================================

ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS consent_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS consent_refresh_required BOOLEAN DEFAULT false;

-- Function: Check and update expired consents
CREATE OR REPLACE FUNCTION check_expired_consents()
RETURNS TABLE (
  conversation_id UUID,
  bot_id UUID,
  expired_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Mark consents as expired
  UPDATE conversations
  SET 
    consent_given = false,
    consent_refresh_required = true,
    updated_at = NOW()
  WHERE consent_given = true
  AND consent_expires_at IS NOT NULL
  AND consent_expires_at < NOW();
  
  -- Return expired consents
  RETURN QUERY
  SELECT 
    c.id,
    c.bot_id,
    c.consent_expires_at
  FROM conversations c
  WHERE c.consent_refresh_required = true
  AND c.consent_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. ENCRYPTION NOTES (Supabase Vault)
-- ============================================

-- NOTE: For sensitive data encryption, use Supabase Vault:
-- 1. Enable Supabase Vault in Dashboard
-- 2. Use pgcrypto extension for encryption
-- 3. Store encryption keys in Supabase Vault
-- 4. Example:
--    SELECT vault.create_secret('encryption_key', 'your-key-here');
--    SELECT vault.create_secret('whatsapp_api_key', 'your-api-key');

-- Function: Encrypt sensitive data (requires pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt text (example - actual implementation depends on key management)
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, secret_name TEXT DEFAULT 'encryption_key')
RETURNS BYTEA AS $$
BEGIN
  -- This is a placeholder - actual implementation should use Supabase Vault
  -- For now, we'll use pgcrypto with a placeholder
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key', true));
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt text
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data BYTEA, secret_name TEXT DEFAULT 'encryption_key')
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key', true));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGERS FOR AUTO-AUDIT
-- ============================================

-- Trigger: Auto-log bot updates
CREATE OR REPLACE FUNCTION audit_bot_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (
      bot_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      severity
    ) VALUES (
      NEW.id,
      auth.uid(),
      'update',
      'bot',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
        )
      ),
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bot_changes_audit
  AFTER UPDATE ON bots
  FOR EACH ROW
  EXECUTE FUNCTION audit_bot_changes();

-- Trigger: Auto-log consent changes
CREATE OR REPLACE FUNCTION audit_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.consent_given IS DISTINCT FROM NEW.consent_given) THEN
    INSERT INTO consent_log (
      conversation_id,
      action,
      consent_type,
      timestamp
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.consent_given = true THEN 'given'
        WHEN NEW.consent_given = false AND OLD.consent_given = true THEN 'withdrawn'
        ELSE 'updated'
      END,
      'data_processing',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER consent_changes_audit
  AFTER UPDATE OF consent_given ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION audit_consent_changes();

-- ============================================
-- 10. VIEWS FOR COMPLIANCE REPORTING
-- ============================================

-- View: Compliance Status Overview
CREATE OR REPLACE VIEW compliance_status AS
SELECT 
  b.id as bot_id,
  b.name,
  cs.region,
  cs.gdpr_enabled,
  cs.consent_required,
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(DISTINCT CASE WHEN c.consent_given = true THEN c.id END) as consented_count,
  COUNT(DISTINCT CASE WHEN c.consent_expires_at < NOW() AND c.consent_given = true THEN c.id END) as expired_consents,
  COUNT(DISTINCT dr.id) as pending_data_requests,
  COUNT(DISTINCT db.id) as open_data_breaches,
  COUNT(DISTINCT pr.id) as processing_records_count
FROM bots b
LEFT JOIN compliance_settings cs ON b.id = cs.bot_id
LEFT JOIN conversations c ON b.id = c.bot_id AND c.deleted_at IS NULL
LEFT JOIN data_requests dr ON c.id = dr.conversation_id AND dr.status = 'pending'
LEFT JOIN data_breaches db ON b.id = db.bot_id AND db.status IN ('open', 'investigating')
LEFT JOIN processing_records pr ON b.id = pr.bot_id
GROUP BY b.id, b.name, cs.region, cs.gdpr_enabled, cs.consent_required;

-- View: Security Events Summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
  bot_id,
  DATE(created_at) as event_date,
  severity,
  action,
  COUNT(*) as event_count
FROM audit_log
WHERE severity IN ('warning', 'error', 'critical')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY bot_id, DATE(created_at), severity, action
ORDER BY event_date DESC, severity DESC;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_conversations_consent_expires ON conversations(consent_expires_at) WHERE consent_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_consent_refresh ON conversations(consent_refresh_required) WHERE consent_refresh_required = true;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE processing_records IS 'DSGVO Art. 30: Verzeichnis der Verarbeitungstätigkeiten';
COMMENT ON TABLE data_breaches IS 'DSGVO Art. 33-34: Datenschutzverletzungen';
COMMENT ON TABLE data_transfers IS 'DSGVO Art. 44-49: Übermittlung in Drittländer';
COMMENT ON TABLE rate_limits IS 'Rate Limiting für API & Webhooks';
COMMENT ON FUNCTION check_breach_reporting_deadline() IS 'Prüft 72h Frist für DSGVO Art. 33 Meldung';
COMMENT ON FUNCTION check_expired_consents() IS 'Prüft und markiert abgelaufene Einwilligungen';

