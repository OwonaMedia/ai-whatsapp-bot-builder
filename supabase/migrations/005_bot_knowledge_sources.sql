-- ============================================
-- Migration 005: Bot-specific Knowledge Sources
-- ============================================

-- Add bot_id to knowledge_sources for multi-tenant support
ALTER TABLE knowledge_sources
ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS content TEXT; -- For direct text sources

-- Add index for faster bot-specific queries
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_bot_id ON knowledge_sources(bot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_user_bot ON knowledge_sources(user_id, bot_id);

-- Update RLS policies to support bot-specific access
DROP POLICY IF EXISTS "Users can view their own knowledge sources." ON knowledge_sources;
DROP POLICY IF EXISTS "Users can insert their own knowledge sources." ON knowledge_sources;
DROP POLICY IF EXISTS "Users can update their own knowledge sources." ON knowledge_sources;
DROP POLICY IF EXISTS "Users can delete their own knowledge sources." ON knowledge_sources;

-- New policies with bot support
CREATE POLICY "Users can view their own knowledge sources." ON knowledge_sources
  FOR SELECT USING (
    auth.uid() = user_id AND
    (bot_id IS NULL OR EXISTS (
      SELECT 1 FROM bots WHERE bots.id = knowledge_sources.bot_id AND bots.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert their own knowledge sources." ON knowledge_sources
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (bot_id IS NULL OR EXISTS (
      SELECT 1 FROM bots WHERE bots.id = knowledge_sources.bot_id AND bots.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their own knowledge sources." ON knowledge_sources
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (bot_id IS NULL OR EXISTS (
      SELECT 1 FROM bots WHERE bots.id = knowledge_sources.bot_id AND bots.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their own knowledge sources." ON knowledge_sources
  FOR DELETE USING (
    auth.uid() = user_id AND
    (bot_id IS NULL OR EXISTS (
      SELECT 1 FROM bots WHERE bots.id = knowledge_sources.bot_id AND bots.user_id = auth.uid()
    ))
  );

