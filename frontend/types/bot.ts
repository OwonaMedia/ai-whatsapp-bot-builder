/**
 * Bot Flow Types
 */

export type NodeType = 
  | 'trigger'
  | 'message'
  | 'question'
  | 'condition'
  | 'ai'
  | 'knowledge'
  | 'webhook'
  | 'wait'
  | 'end';

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: NodeConfig;
    botId?: string; // ✅ Optional: Für Knowledge Nodes benötigt
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface BotFlow {
  id?: string;
  bot_id?: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: {
    version: number;
    created_at?: string;
    updated_at?: string;
  };
}

export interface NodeConfig {
  // Trigger Node
  trigger_type?: 'whatsapp_message' | 'web_chat' | 'customer_service_chat' | 'keyword' | 'always';
  keyword?: string;
  trigger_source?: 'whatsapp' | 'web_chat' | 'both'; // Für Multi-Channel
  
  // Message Node
  message_text?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document';
  
  // Question Node
  question_text?: string;
  options?: Array<{ id: string; label: string; value: string }>;
  allow_custom_response?: boolean;
  
  // Condition Node
  condition_type?: 'equals' | 'contains' | 'greater_than' | 'less_than';
  condition_field?: string;
  condition_value?: string;
  
  // AI Node
  ai_prompt?: string;
  ai_model?: 'groq' | 'openai' | 'gemini';
  use_context?: boolean;
  use_knowledge?: boolean; // Nutze Knowledge Sources
  
  // Knowledge Source Node
  knowledge_source_type?: 'pdf' | 'url' | 'text';
  knowledge_source_url?: string;
  knowledge_source_text?: string;
  knowledge_source_title?: string;
  knowledge_source_id?: string; // Referenz zu bestehender Source
  
  // Webhook Node
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST' | 'PUT';
  webhook_headers?: Record<string, string>;
  webhook_body?: string;
  
  // Wait Node
  wait_duration?: number; // seconds
  wait_until?: string; // timestamp
  
  // Common
  error_handling?: 'continue' | 'end' | 'redirect';
  error_message?: string;
}

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  whatsapp_business_id: string | null;
  use_case: string | null; // For Meta compliance
  compliance_settings: Record<string, unknown>;
  bot_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Optional analytics properties (may not exist in all queries)
  conversation_count?: number;
  message_count?: number;
}

