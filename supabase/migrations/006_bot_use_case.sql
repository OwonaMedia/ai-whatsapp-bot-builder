-- ============================================
-- Migration 006: Bot Use Case for Compliance
-- ============================================

-- Add use_case field to bots table
ALTER TABLE bots
ADD COLUMN IF NOT EXISTS use_case TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bots_use_case ON bots(use_case);

-- Add comment
COMMENT ON COLUMN bots.use_case IS 'Business use case for Meta WhatsApp compliance (customer_service, booking, ecommerce, information, etc.)';

