-- Leads Table für Sales MCP Server
-- Speichert Leads die durch den Sales Chatbot erstellt werden

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'sales-chatbot',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- RLS Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role can manage all leads
CREATE POLICY "Service role can manage leads"
  ON leads
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Authenticated users can read their own leads
CREATE POLICY "Users can read their own leads"
  ON leads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE leads IS 'Leads erstellt durch Sales Chatbot und andere Quellen';
COMMENT ON COLUMN leads.source IS 'Quelle des Leads (sales-chatbot, website, etc.)';
COMMENT ON COLUMN leads.status IS 'Status: new, contacted, qualified, converted, lost';
COMMENT ON COLUMN leads.metadata IS 'Zusätzliche Metadaten (agent, locale, etc.)';

