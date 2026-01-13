-- ============================================
-- PAYMENT PROVIDER CREDENTIAL STORE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_credentials (
  provider TEXT PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'production',
  status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'disabled'
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_payment_credentials_updated_at
  BEFORE UPDATE ON payment_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default providers if missing
INSERT INTO payment_credentials (provider, environment, status, config, metadata)
VALUES
  (
    'stripe',
    'test',
    'inactive',
    '{}'::JSONB,
    jsonb_build_object(
      'required_fields', ARRAY['secret_key', 'publishable_key', 'webhook_secret'],
      'docs', 'https://dashboard.stripe.com/apikeys',
      'notes', 'Test- oder Live-Schlüssel hier hinterlegen.'
    )
  ),
  (
    'paypal',
    'sandbox',
    'inactive',
    '{}'::JSONB,
    jsonb_build_object(
      'required_fields', ARRAY['client_id', 'client_secret', 'mode'],
      'docs', 'https://developer.paypal.com/dashboard/applications',
      'notes', 'Sandbox- oder Live-Credentials hinterlegen.'
    )
  ),
  (
    'mtn-mobile-money',
    'sandbox',
    'inactive',
    '{}'::JSONB,
    jsonb_build_object(
      'required_fields', ARRAY['api_key', 'user_id', 'primary_key', 'target_environment'],
      'docs', 'https://momodeveloper.mtn.com/api-documentation',
      'notes', 'Collections API Credentials (Sandbox oder Production).'
    )
  )
ON CONFLICT (provider) DO NOTHING;

-- Notify PostgREST so cached schema/configs refresh automatically
SELECT pg_notify('pgrst', 'reload schema');

