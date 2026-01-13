import { createClient } from '@/lib/supabase';
import { ConversationState } from './types';

/**
 * Conversation State Manager
 * Handles loading and saving conversation states
 */
export class StateManager {
  /**
   * Get or create conversation state
   */
  static async getOrCreateState(
    conversationId: string,
    botId: string
  ): Promise<ConversationState> {
    const supabase = createClient();

    let { data: state } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (!state) {
      // Create new state
      const { data: newState, error } = await supabase
        .from('conversation_states')
        .insert({
          conversation_id: conversationId,
          bot_id: botId,
          current_node_id: null,
          variables: {},
          context: {},
          execution_history: [],
        })
        .select()
        .single();

      if (error) throw error;
      state = newState;
    }

    return {
      conversationId: state.conversation_id,
      botId: state.bot_id,
      currentNodeId: state.current_node_id,
      context: state.context || {},
      variables: state.variables || {},
      history: state.execution_history || [],
      createdAt: state.created_at,
      updatedAt: state.updated_at,
    };
  }

  /**
   * Update conversation state
   */
  static async updateState(state: ConversationState): Promise<void> {
    const supabase = createClient();

    await supabase
      .from('conversation_states')
      .update({
        current_node_id: state.currentNodeId,
        variables: state.variables,
        context: state.context,
        execution_history: state.history,
        updated_at: new Date().toISOString(),
      })
      .eq('conversation_id', state.conversationId);
  }

  /**
   * Update state with user message
   */
  static async updateWithUserMessage(
    conversationId: string,
    message: string
  ): Promise<void> {
    const supabase = createClient();

    const { data: state } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (state) {
      await supabase
        .from('conversation_states')
        .update({
          context: {
            ...(state.context || {}),
            lastMessage: message,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId);
    }
  }
}

