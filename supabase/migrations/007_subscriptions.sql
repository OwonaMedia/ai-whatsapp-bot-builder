-- ============================================
-- SUBSCRIPTION SYSTEM
-- Pricing-Tiers und Limit-Management
-- ============================================

-- ============================================
-- SUBSCRIPTIONS TABLE
-- Detailliertes Subscription-Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  -- Payment provider info (optional, für zukünftige Integration)
  payment_provider TEXT, -- 'paypal', 'stripe', 'manual'
  payment_provider_subscription_id TEXT,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- Ein User kann nur eine aktive Subscription haben
);

-- ============================================
-- SUBSCRIPTION LIMITS TABLE
-- Tier-spezifische Limits
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_limits (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
  max_bots INTEGER NOT NULL,
  max_messages_per_month INTEGER NOT NULL,
  max_conversations_per_month INTEGER,
  features JSONB DEFAULT '{}', -- {'analytics_export': true, 'api_access': false, ...}
  support_level TEXT DEFAULT 'community' CHECK (support_level IN ('community', 'email', 'priority', 'dedicated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USAGE TRACKING TABLE
-- Monatliche Nutzungsstatistiken
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  month DATE NOT NULL, -- YYYY-MM-01 format
  bots_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  conversations_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- ============================================
-- INSERT DEFAULT SUBSCRIPTION LIMITS
-- ============================================
INSERT INTO subscription_limits (tier, max_bots, max_messages_per_month, max_conversations_per_month, features, support_level) VALUES
  ('free', 1, 100, NULL, 
   '{"analytics_export": false, "api_access": false, "white_label": false, "custom_integrations": false, "funnel_analysis": false, "templates": true}'::jsonb,
   'community'),
  ('starter', 3, 1000, NULL,
   '{"analytics_export": true, "api_access": false, "white_label": false, "custom_integrations": false, "funnel_analysis": false, "templates": true}'::jsonb,
   'email'),
  ('professional', 10, 10000, NULL,
   '{"analytics_export": true, "api_access": true, "white_label": true, "custom_integrations": true, "funnel_analysis": true, "templates": true}'::jsonb,
   'priority'),
  ('enterprise', -1, -1, -1, -- -1 = unlimited
   '{"analytics_export": true, "api_access": true, "white_label": true, "custom_integrations": true, "funnel_analysis": true, "templates": true}'::jsonb,
   'dedicated')
ON CONFLICT (tier) DO UPDATE SET
  max_bots = EXCLUDED.max_bots,
  max_messages_per_month = EXCLUDED.max_messages_per_month,
  max_conversations_per_month = EXCLUDED.max_conversations_per_month,
  features = EXCLUDED.features,
  support_level = EXCLUDED.support_level,
  updated_at = NOW();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month ON usage_tracking(month);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies für Subscriptions
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies für Usage Tracking
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  tier TEXT;
BEGIN
  SELECT s.tier INTO tier
  FROM subscriptions s
  WHERE s.user_id = user_uuid
  AND s.status = 'active'
  AND s.current_period_end > NOW();
  
  -- Fallback to free if no active subscription
  RETURN COALESCE(tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get subscription limits for a tier
CREATE OR REPLACE FUNCTION get_subscription_limits(tier_name TEXT)
RETURNS TABLE (
  max_bots INTEGER,
  max_messages_per_month INTEGER,
  max_conversations_per_month INTEGER,
  features JSONB,
  support_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.max_bots,
    sl.max_messages_per_month,
    sl.max_conversations_per_month,
    sl.features,
    sl.support_level
  FROM subscription_limits sl
  WHERE sl.tier = tier_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can create a bot
CREATE OR REPLACE FUNCTION can_create_bot(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  max_bots INTEGER;
  current_bots INTEGER;
BEGIN
  -- Get user's subscription tier
  user_tier := get_user_subscription_tier(user_uuid);
  
  -- Get limits for tier
  SELECT sl.max_bots INTO max_bots
  FROM subscription_limits sl
  WHERE sl.tier = user_tier;
  
  -- Unlimited (-1) means always allowed
  IF max_bots = -1 THEN
    RETURN true;
  END IF;
  
  -- Count current bots (excluding archived)
  SELECT COUNT(*) INTO current_bots
  FROM bots
  WHERE user_id = user_uuid
  AND status != 'archived';
  
  -- Check if under limit
  RETURN current_bots < max_bots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can send message (monthly limit)
CREATE OR REPLACE FUNCTION can_send_message(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  max_messages INTEGER;
  current_month_messages INTEGER;
  current_month DATE;
BEGIN
  -- Get user's subscription tier
  user_tier := get_user_subscription_tier(user_uuid);
  
  -- Get limits for tier
  SELECT sl.max_messages_per_month INTO max_messages
  FROM subscription_limits sl
  WHERE sl.tier = user_tier;
  
  -- Unlimited (-1) means always allowed
  IF max_messages = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current month (first day)
  current_month := DATE_TRUNC('month', NOW())::DATE;
  
  -- Get or create usage tracking for current month
  INSERT INTO usage_tracking (user_id, month, messages_count)
  VALUES (user_uuid, current_month, 0)
  ON CONFLICT (user_id, month) DO NOTHING;
  
  -- Get current month's message count
  SELECT ut.messages_count INTO current_month_messages
  FROM usage_tracking ut
  WHERE ut.user_id = user_uuid
  AND ut.month = current_month;
  
  -- Check if under limit
  RETURN COALESCE(current_month_messages, 0) < max_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment message usage
CREATE OR REPLACE FUNCTION increment_message_usage(user_uuid UUID)
RETURNS void AS $$
DECLARE
  current_month DATE;
BEGIN
  current_month := DATE_TRUNC('month', NOW())::DATE;
  
  -- Insert or update usage tracking
  INSERT INTO usage_tracking (user_id, month, messages_count)
  VALUES (user_uuid, current_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    messages_count = usage_tracking.messages_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current usage for user
CREATE OR REPLACE FUNCTION get_user_usage(user_uuid UUID)
RETURNS TABLE (
  bots_count INTEGER,
  messages_count INTEGER,
  conversations_count INTEGER,
  month DATE
) AS $$
DECLARE
  current_month DATE;
BEGIN
  current_month := DATE_TRUNC('month', NOW())::DATE;
  
  RETURN QUERY
  SELECT 
    COALESCE(ut.bots_count, 0)::INTEGER,
    COALESCE(ut.messages_count, 0)::INTEGER,
    COALESCE(ut.conversations_count, 0)::INTEGER,
    current_month
  FROM usage_tracking ut
  WHERE ut.user_id = user_uuid
  AND ut.month = current_month
  UNION ALL
  SELECT 
    (SELECT COUNT(*) FROM bots WHERE user_id = user_uuid AND status != 'archived')::INTEGER,
    0::INTEGER,
    0::INTEGER,
    current_month
  WHERE NOT EXISTS (
    SELECT 1 FROM usage_tracking WHERE user_id = user_uuid AND month = current_month
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if feature is available for user
CREATE OR REPLACE FUNCTION has_feature(user_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  features JSONB;
BEGIN
  -- Get user's subscription tier
  user_tier := get_user_subscription_tier(user_uuid);
  
  -- Get features for tier
  SELECT sl.features INTO features
  FROM subscription_limits sl
  WHERE sl.tier = user_tier;
  
  -- Check if feature exists and is enabled
  RETURN COALESCE((features->>feature_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-create free subscription on user signup
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    user_id,
    tier,
    status,
    billing_cycle,
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id,
    'free',
    'active',
    'monthly',
    NOW(),
    NOW() + INTERVAL '1 year' -- Free tier doesn't expire
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create free subscription when user signs up
DROP TRIGGER IF EXISTS on_user_created_subscription ON auth.users;
CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription();

-- Update trigger
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================

-- View: User subscription overview
CREATE OR REPLACE VIEW user_subscription_overview AS
SELECT 
  u.id as user_id,
  u.email,
  s.tier,
  s.status,
  s.billing_cycle,
  s.current_period_start,
  s.current_period_end,
  sl.max_bots,
  sl.max_messages_per_month,
  sl.features,
  sl.support_level,
  (SELECT COUNT(*) FROM bots WHERE user_id = u.id AND status != 'archived') as current_bots,
  COALESCE(ut.messages_count, 0) as current_month_messages
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.current_period_end > NOW()
LEFT JOIN subscription_limits sl ON COALESCE(s.tier, 'free') = sl.tier
LEFT JOIN usage_tracking ut ON u.id = ut.user_id AND ut.month = DATE_TRUNC('month', NOW())::DATE;

