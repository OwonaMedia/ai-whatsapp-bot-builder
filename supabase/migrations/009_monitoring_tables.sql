-- ============================================
-- MONITORING & LOGGING TABLES
-- - payment_events: Stores payment audit trail
-- - webhook_events: Stores Stripe/PayPal webhook processing states
-- ============================================

-- Payment events audit table
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2),
  currency TEXT,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'paypal', 'manual', 'mollie', 'klarna')),
  payment_provider_id TEXT,
  event_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded', 'canceled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_id ON payment_events(payment_provider, payment_provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON payment_events(status);

-- Enable Row Level Security (restrict by default)
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Only service role (SUPABASE_SERVICE_ROLE_KEY) may insert/select by default
CREATE POLICY payment_events_service_role_policy ON payment_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- WEBHOOK EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'mollie', 'klarna', 'custom')),
  event_id TEXT,
  event_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed')),
  http_status INTEGER,
  error_message TEXT,
  payload JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_unique ON webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_service_role_policy ON webhook_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


