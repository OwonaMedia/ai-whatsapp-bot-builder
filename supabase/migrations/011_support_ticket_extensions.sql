-- ============================================
-- SUPPORT TICKET EXTENSIONS (Tier-1/Tier-2 UX)
-- ============================================

ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quick_reply_options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assigned_agent text,
  ADD COLUMN IF NOT EXISTS last_escalation timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_path jsonb NOT NULL DEFAULT '[]'::jsonb;


