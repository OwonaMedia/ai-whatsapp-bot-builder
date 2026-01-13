-- WhatsApp Afrika Bot - Konversationshistorie
-- Speichert die Konversationshistorie für den Afrika WhatsApp Bot
-- Ermöglicht Bot-Gedächtnis über mehrere Nachrichten hinweg

CREATE TABLE IF NOT EXISTS whatsapp_afrika_conversations (
  conversation_id TEXT PRIMARY KEY, -- sender phone number (z.B. "4962038458741")
  history JSONB DEFAULT '[]'::jsonb, -- Array von {role: 'user'|'assistant', content: string, timestamp: timestamp}
  language TEXT DEFAULT 'de', -- Erkannte Sprache (de, en, fr)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_whatsapp_afrika_conversations_updated_at ON whatsapp_afrika_conversations(updated_at DESC);

-- RLS Policies
ALTER TABLE whatsapp_afrika_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role kann alles verwalten
CREATE POLICY "Service role can manage whatsapp afrika conversations"
  ON whatsapp_afrika_conversations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Anon Key kann lesen und schreiben (für n8n)
CREATE POLICY "Anon can read whatsapp afrika conversations"
  ON whatsapp_afrika_conversations
  FOR SELECT
  USING (true);

CREATE POLICY "Anon can insert whatsapp afrika conversations"
  ON whatsapp_afrika_conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update whatsapp afrika conversations"
  ON whatsapp_afrika_conversations
  FOR UPDATE
  USING (true);

-- ============================================
-- RPC FUNCTION: Get Conversation History
-- ============================================
CREATE OR REPLACE FUNCTION get_afrika_conversation_history(p_conversation_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_history JSONB;
BEGIN
  SELECT history INTO v_history
  FROM whatsapp_afrika_conversations
  WHERE conversation_id = p_conversation_id;
  
  RETURN COALESCE(v_history, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC FUNCTION: Save Conversation History
-- ============================================
CREATE OR REPLACE FUNCTION save_afrika_conversation_history(
  p_conversation_id TEXT,
  p_user_message TEXT,
  p_assistant_message TEXT,
  p_language TEXT DEFAULT 'de'
)
RETURNS VOID AS $$
DECLARE
  v_history JSONB;
  v_new_entry JSONB;
BEGIN
  -- Hole aktuelle Historie
  SELECT history INTO v_history
  FROM whatsapp_afrika_conversations
  WHERE conversation_id = p_conversation_id;
  
  -- Initialisiere als leeres Array falls nicht vorhanden
  v_history := COALESCE(v_history, '[]'::jsonb);
  
  -- Füge neue Nachrichten hinzu
  v_new_entry := jsonb_build_array(
    jsonb_build_object(
      'role', 'user',
      'content', p_user_message,
      'timestamp', NOW()
    ),
    jsonb_build_object(
      'role', 'assistant',
      'content', p_assistant_message,
      'timestamp', NOW()
    )
  );
  
  v_history := v_history || v_new_entry;
  
  -- Begrenze auf letzte 20 Nachrichten (10 User + 10 Assistant = 20 Einträge)
  -- Das entspricht den letzten 10 Konversationsrunden
  IF jsonb_array_length(v_history) > 20 THEN
    v_history := (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_history) AS elem
        ORDER BY (elem->>'timestamp') DESC
        LIMIT 20
      ) AS sub
    );
  END IF;
  
  -- Upsert in Tabelle
  INSERT INTO whatsapp_afrika_conversations (
    conversation_id,
    history,
    language,
    updated_at
  )
  VALUES (
    p_conversation_id,
    v_history,
    p_language,
    NOW()
  )
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    history = EXCLUDED.history,
    language = EXCLUDED.language,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC FUNCTION: Clear Conversation History
-- ============================================
CREATE OR REPLACE FUNCTION clear_afrika_conversation_history(p_conversation_id TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM whatsapp_afrika_conversations
  WHERE conversation_id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

