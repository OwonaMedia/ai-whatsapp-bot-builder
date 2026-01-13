-- ============================================
-- AI WhatsApp Business Bot Builder
-- Initial Database Schema
-- DSGVO-konform & Compliance-Ready
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp_business_id TEXT,
  whatsapp_phone_number TEXT, -- Pseudonymisiert
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'
  compliance_settings JSONB DEFAULT '{}',
  bot_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS TABLE
-- Pseudonymisiert für DSGVO
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL, -- Pseudonymisiert
  phone_hash TEXT NOT NULL, -- Hash für Pseudonymisierung
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  consent_method TEXT, -- 'opt_in', 'double_opt_in'
  consent_ip_address TEXT, -- Anonymisiert
  data_retention_until TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active', -- 'active', 'blocked', 'deleted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft Delete
  UNIQUE(bot_id, phone_hash)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  message_type TEXT, -- 'text', 'image', 'video', 'document', 'template', 'location'
  content TEXT,
  media_url TEXT, -- Encrypted URL
  template_name TEXT,
  whatsapp_message_id TEXT UNIQUE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  encrypted_content TEXT -- Für Compliance
);

-- ============================================
-- CONSENT_LOG TABLE
-- Vollständige Consent-Historie für DSGVO
-- ============================================
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'given', 'withdrawn', 'updated'
  consent_type TEXT, -- 'marketing', 'data_processing', 'analytics'
  ip_address TEXT, -- Anonymisiert
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  verified_token TEXT -- Für Verifizierung
);

-- ============================================
-- DATA_REQUESTS TABLE
-- DSGVO Art. 15-22 Anfragen
-- ============================================
CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'access', 'deletion', 'correction', 'portability', 'restriction'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  request_data JSONB,
  response_data JSONB,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_token TEXT, -- Für Verifizierung
  expiry_at TIMESTAMP WITH TIME ZONE -- Token-Ablauf
);

-- ============================================
-- AUDIT_LOG TABLE
-- Compliance-Audit-Trail
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address TEXT, -- Anonymisiert
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMPLIANCE_SETTINGS TABLE
-- Region-spezifische Compliance-Einstellungen
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  region TEXT NOT NULL DEFAULT 'EU', -- 'EU', 'US', 'BR', 'CH', 'UK', etc.
  gdpr_enabled BOOLEAN DEFAULT true,
  consent_required BOOLEAN DEFAULT true,
  double_opt_in BOOLEAN DEFAULT false,
  data_retention_days INTEGER DEFAULT 365,
  auto_deletion_enabled BOOLEAN DEFAULT true,
  privacy_policy_url TEXT,
  terms_url TEXT,
  imprint_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, region)
);

-- ============================================
-- BLOCKED_CONTENT TABLE
-- WhatsApp Compliance Filter
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  action TEXT DEFAULT 'block', -- 'block', 'warn', 'moderate'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, keyword)
);

-- ============================================
-- BOT_FLOWS TABLE
-- Bot-Flow-Konfiguration (Flow-Builder)
-- ============================================
CREATE TABLE IF NOT EXISTS bot_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flow_data JSONB NOT NULL, -- Flow-Konfiguration
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ANALYTICS TABLE
-- Bot-Performance & Metriken
-- ============================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'messages_sent', 'messages_received', 'conversations', 'conversions'
  metric_value INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, date, metric_type)
);

-- ============================================
-- TEMPLATES TABLE
-- WhatsApp Message Templates
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'marketing', 'utility', 'authentication'
  content TEXT NOT NULL,
  whatsapp_template_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  language TEXT DEFAULT 'de',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES für Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
CREATE INDEX IF NOT EXISTS idx_conversations_bot_id ON conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone_hash ON conversations(phone_hash);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_consent_log_conversation_id ON consent_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_timestamp ON consent_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_requests_conversation_id ON data_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_bot_id ON audit_log(bot_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_settings_bot_id ON compliance_settings(bot_id);
CREATE INDEX IF NOT EXISTS idx_blocked_content_bot_id ON blocked_content(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_flows_bot_id ON bot_flows(bot_id);
CREATE INDEX IF NOT EXISTS idx_analytics_bot_id ON analytics(bot_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_templates_bot_id ON templates(bot_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies für Bots
CREATE POLICY "Users can view own bots" ON bots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bots" ON bots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bots" ON bots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bots" ON bots
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies für Conversations (nur Bot-Owner)
CREATE POLICY "Users can view conversations of own bots" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = conversations.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- RLS Policies für Messages (nur Bot-Owner)
CREATE POLICY "Users can view messages of own bots" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN bots ON bots.id = conversations.bot_id
      WHERE conversations.id = messages.conversation_id
      AND bots.user_id = auth.uid()
    )
  );

-- Ähnliche Policies für andere Tabellen...

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers für updated_at
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_settings_updated_at BEFORE UPDATE ON compliance_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_flows_updated_at BEFORE UPDATE ON bot_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Automatic data deletion (DSGVO Art. 17)
CREATE OR REPLACE FUNCTION auto_delete_expired_data()
RETURNS void AS $$
BEGIN
    -- Delete conversations where retention period expired
    UPDATE conversations
    SET deleted_at = NOW(), status = 'deleted'
    WHERE data_retention_until < NOW()
    AND deleted_at IS NULL
    AND auto_deletion_enabled = true;
END;
$$ LANGUAGE plpgsql;

-- Function: Pseudonymize phone numbers
CREATE OR REPLACE FUNCTION pseudonymize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Hash phone number for pseudonymization
    RETURN encode(digest(phone || current_setting('app.salt', true), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View: Bot Statistics
CREATE OR REPLACE VIEW bot_statistics AS
SELECT 
    b.id as bot_id,
    b.name,
    b.status,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.id END) as inbound_messages,
    COUNT(DISTINCT CASE WHEN m.direction = 'outbound' THEN m.id END) as outbound_messages,
    COUNT(DISTINCT CASE WHEN c.consent_given = true THEN c.id END) as consented_conversations
FROM bots b
LEFT JOIN conversations c ON b.id = c.bot_id AND c.deleted_at IS NULL
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY b.id, b.name, b.status;

-- View: Compliance Overview
CREATE OR REPLACE VIEW compliance_overview AS
SELECT 
    b.id as bot_id,
    b.name,
    cs.region,
    cs.gdpr_enabled,
    cs.consent_required,
    cs.double_opt_in,
    cs.data_retention_days,
    cs.auto_deletion_enabled,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN c.consent_given = true THEN c.id END) as consented_count,
    COUNT(DISTINCT dr.id) as pending_data_requests
FROM bots b
LEFT JOIN compliance_settings cs ON b.id = cs.bot_id
LEFT JOIN conversations c ON b.id = c.bot_id AND c.deleted_at IS NULL
LEFT JOIN data_requests dr ON c.id = dr.conversation_id AND dr.status = 'pending'
GROUP BY b.id, b.name, cs.region, cs.gdpr_enabled, cs.consent_required, cs.double_opt_in, cs.data_retention_days, cs.auto_deletion_enabled;

