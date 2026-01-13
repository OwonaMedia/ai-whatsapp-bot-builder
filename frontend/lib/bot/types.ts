/**
 * Types for bot flow execution
 */

export interface ConversationState {
  conversationId: string;
  botId: string;
  currentNodeId: string | null;
  context: Record<string, any>;
  variables: Record<string, any>;
  history: Array<{
    nodeId: string;
    timestamp: string;
    data?: any;
  }>;
  lastUserMessage?: string;
  createdAt: string;
  updatedAt: string;
}

