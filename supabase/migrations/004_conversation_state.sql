-- ============================================
-- Migration 004: Conversation State Management
-- ============================================

-- Add state management to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS current_node_id TEXT,
ADD COLUMN IF NOT EXISTS flow_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS execution_history JSONB DEFAULT '[]';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_bot_status ON conversations(bot_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_phone_hash ON conversations(phone_hash);

-- ============================================
-- CONVERSATION STATE TABLE (Alternative approach)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  current_node_id TEXT,
  flow_state JSONB DEFAULT '{}', -- Current flow state
  variables JSONB DEFAULT '{}', -- User variables
  context JSONB DEFAULT '{}', -- Conversation context
  execution_history JSONB DEFAULT '[]', -- Node execution history
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_states_conversation ON conversation_states(conversation_id);
CREATE INDEX idx_conversation_states_bot ON conversation_states(bot_id);

-- ============================================
-- FUNCTION: Update conversation state
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_state(
  p_conversation_id UUID,
  p_node_id TEXT,
  p_variables JSONB DEFAULT '{}'::jsonb,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO conversation_states (
    conversation_id,
    bot_id,
    current_node_id,
    variables,
    context,
    updated_at
  )
  SELECT 
    p_conversation_id,
    c.bot_id,
    p_node_id,
    COALESCE(cs.variables, '{}'::jsonb) || p_variables,
    COALESCE(cs.context, '{}'::jsonb) || p_context,
    NOW()
  FROM conversations c
  LEFT JOIN conversation_states cs ON cs.conversation_id = c.id
  WHERE c.id = p_conversation_id
  ON CONFLICT (conversation_id) 
  DO UPDATE SET
    current_node_id = EXCLUDED.current_node_id,
    variables = conversation_states.variables || EXCLUDED.variables,
    context = conversation_states.context || EXCLUDED.context,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

