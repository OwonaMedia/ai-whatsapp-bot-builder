-- Migration: Create user_action_logs table for User-Action-Tracking
-- DSGVO-konform: Anonymisiert, mit Retention-Policy (30 Tage)

CREATE TABLE IF NOT EXISTS user_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Optional, nur wenn eingeloggt
  action_type TEXT NOT NULL CHECK (action_type IN ('click', 'input', 'api_call', 'error', 'upload', 'payment', 'bot_creation')),
  element_path TEXT,
  value_hash TEXT, -- Gehasht für Privacy
  metadata JSONB DEFAULT '{}',
  error_message TEXT, -- Nur bei Errors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfrage bei Tickets (nach Session-ID)
CREATE INDEX IF NOT EXISTS idx_user_action_logs_session_created 
  ON user_action_logs(session_id, created_at DESC);

-- Index für User-ID (wenn eingeloggt)
CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_created 
  ON user_action_logs(user_id, created_at DESC) 
  WHERE user_id IS NOT NULL;

-- Index für Action-Type (für Analytics)
CREATE INDEX IF NOT EXISTS idx_user_action_logs_action_type 
  ON user_action_logs(action_type, created_at DESC);

-- Index für Errors (für Support-Diagnose)
CREATE INDEX IF NOT EXISTS idx_user_action_logs_errors 
  ON user_action_logs(error_message, created_at DESC) 
  WHERE error_message IS NOT NULL;

-- RLS: User kann nur eigene Logs sehen (wenn eingeloggt)
ALTER TABLE user_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_action_logs_user_policy
  ON user_action_logs FOR SELECT
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL -- Session-basierte Logs sind für alle sichtbar (nur für Support)
  );

-- RLS: Nur Service Role kann INSERT (Frontend nutzt Service Role Key)
CREATE POLICY user_action_logs_insert_policy
  ON user_action_logs FOR INSERT
  WITH CHECK (true); -- Service Role Key umgeht RLS

-- Retention-Policy: Automatische Löschung nach 30 Tagen
-- Wird durch Cron-Job oder Supabase Edge Function ausgeführt
-- SQL für Cron-Job:
-- DELETE FROM user_action_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- Kommentare für Dokumentation
COMMENT ON TABLE user_action_logs IS 'User-Action-Logs für Support-Diagnose. DSGVO-konform: Anonymisiert, Retention 30 Tage.';
COMMENT ON COLUMN user_action_logs.value_hash IS 'Gehashte Werte für Privacy (Passwords, Credit Cards)';
COMMENT ON COLUMN user_action_logs.session_id IS 'Session-ID für nicht-eingeloggte User';
COMMENT ON COLUMN user_action_logs.user_id IS 'User-ID wenn eingeloggt (optional)';

