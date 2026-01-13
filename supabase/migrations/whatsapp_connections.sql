-- WhatsApp Business Account Connections
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted with Supabase Vault
  business_account_id TEXT NOT NULL,
  phone_number TEXT,
  display_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Flows (ersetzt n8n workflows komplett)
CREATE TABLE IF NOT EXISTS bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Visual Builder Configuration
  is_active BOOLEAN DEFAULT false,
  webhook_verify_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation Logs für Analytics
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_flow_id UUID REFERENCES bot_flows(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  metadata JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Analytics
CREATE TABLE IF NOT EXISTS bot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_flow_id UUID REFERENCES bot_flows(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_received INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  users_interacted INTEGER DEFAULT 0,
  avg_response_time DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_flow_id, date)
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_number_id ON whatsapp_connections(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_bot_flows_user_id ON bot_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_flows_whatsapp_connection_id ON bot_flows(whatsapp_connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_bot_flow_id ON whatsapp_conversations(bot_flow_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_processed_at ON whatsapp_conversations(processed_at);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_bot_flow_id_date ON bot_analytics(bot_flow_id, date);

-- Row Level Security
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;

-- Policies für WhatsApp Connections
CREATE POLICY "Users can view own whatsapp connections" ON whatsapp_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp connections" ON whatsapp_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp connections" ON whatsapp_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own whatsapp connections" ON whatsapp_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Policies für Bot Flows
CREATE POLICY "Users can view own bot flows" ON bot_flows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot flows" ON bot_flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot flows" ON bot_flows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot flows" ON bot_flows
  FOR DELETE USING (auth.uid() = user_id);

-- Policies für Conversations (nur lesen für Analytics)
CREATE POLICY "Users can view conversations for own bots" ON whatsapp_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bot_flows
      WHERE bot_flows.id = whatsapp_conversations.bot_flow_id
      AND bot_flows.user_id = auth.uid()
    )
  );

-- Policies für Analytics
CREATE POLICY "Users can view analytics for own bots" ON bot_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bot_flows
      WHERE bot_flows.id = bot_analytics.bot_flow_id
      AND bot_flows.user_id = auth.uid()
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_flows_updated_at
  BEFORE UPDATE ON bot_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
