import { FlowNode, NodeConfig } from '@/types/bot';
import { ConversationState } from './types';
import { WhatsAppClient } from '@/lib/whatsapp/client';

/**
 * Node Executors
 * Handles execution logic for different node types
 */

export interface NodeExecutionResult {
  nextNodeId: string | null;
  shouldPause: boolean; // For question nodes that wait for user input
  variables?: Record<string, any>;
}

export class NodeExecutors {
  /**
   * Execute a node based on type
   */
  static async execute(
    node: FlowNode,
    state: ConversationState,
    whatsappClient: WhatsAppClient,
    phoneNumber: string
  ): Promise<NodeExecutionResult> {
    switch (node.type) {
      case 'trigger':
        return this.executeTrigger(node);
      case 'message':
        return this.executeMessage(node, whatsappClient, phoneNumber);
      case 'question':
        return this.executeQuestion(node, whatsappClient, phoneNumber);
      case 'condition':
        return this.executeCondition(node, state);
      case 'ai':
        return this.executeAI(node, state, whatsappClient, phoneNumber);
      case 'end':
        return this.executeEnd();
      default:
        return { nextNodeId: null, shouldPause: false };
    }
  }

  /**
   * Execute trigger node
   */
  private static executeTrigger(node: FlowNode): NodeExecutionResult {
    const config = node.data.config;
    const triggerType = config.trigger_type || 'whatsapp_message';

    // Check if trigger condition is met
    if (triggerType === 'keyword' && config.keyword) {
      // Keyword matching happens in webhook handler
      // Trigger node just starts the flow
    }

    return { nextNodeId: null, shouldPause: false }; // Continue to next node
  }

  /**
   * Execute message node
   */
  private static async executeMessage(
    node: FlowNode,
    whatsappClient: WhatsAppClient,
    phoneNumber: string
  ): Promise<NodeExecutionResult> {
    const config = node.data.config;
    const messageText = config.message_text || node.data.label;

    if (!messageText) {
      console.error('Message node has no text');
      return { nextNodeId: null, shouldPause: false };
    }

    try {
      await whatsappClient.sendTextMessage(phoneNumber, messageText);
      return { nextNodeId: null, shouldPause: false };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { nextNodeId: null, shouldPause: false };
    }
  }

  /**
   * Execute question node
   */
  private static async executeQuestion(
    node: FlowNode,
    whatsappClient: WhatsAppClient,
    phoneNumber: string
  ): Promise<NodeExecutionResult> {
    const config = node.data.config;
    const questionText = config.question_text || node.data.label;
    const options = config.options || [];

    if (!questionText) {
      console.error('Question node has no text');
      return { nextNodeId: null, shouldPause: false };
    }

    try {
      if (options.length > 0 && options.length <= 3) {
        // Use interactive buttons
        await whatsappClient.sendInteractiveMessage(
          phoneNumber,
          questionText,
          options.map((opt) => ({
            id: opt.id || opt.value,
            title: opt.label || opt.value,
          }))
        );
      } else {
        // Fallback to text message
        await whatsappClient.sendTextMessage(phoneNumber, questionText);
      }

      // Question nodes pause execution and wait for user response
      // The next node will be determined by the response handler
      return {
        nextNodeId: node.id, // Keep current node ID
        shouldPause: true,
      };
    } catch (error: any) {
      console.error('Error sending question:', error);
      return { nextNodeId: null, shouldPause: false };
    }
  }

  /**
   * Execute condition node
   */
  private static executeCondition(
    node: FlowNode,
    state: ConversationState
  ): NodeExecutionResult {
    const config = node.data.config;
    const conditionType = config.condition_type || 'equals';
    const conditionField = config.condition_field || 'last_message';
    const conditionValue = config.condition_value || '';

    // Get value to compare
    let valueToCompare: string;
    if (conditionField === 'last_message') {
      valueToCompare = state.lastUserMessage || '';
    } else {
      valueToCompare = state.variables[conditionField] || '';
    }

    // Evaluate condition
    let conditionMet = false;
    switch (conditionType) {
      case 'equals':
        conditionMet = valueToCompare.toLowerCase() === conditionValue.toLowerCase();
        break;
      case 'contains':
        conditionMet = valueToCompare.toLowerCase().includes(conditionValue.toLowerCase());
        break;
      case 'greater_than':
        conditionMet = parseFloat(valueToCompare) > parseFloat(conditionValue);
        break;
      case 'less_than':
        conditionMet = parseFloat(valueToCompare) < parseFloat(conditionValue);
        break;
    }

    // Return condition result (will be used to determine next node)
    return {
      nextNodeId: null,
      shouldPause: false,
      variables: {
        lastConditionResult: conditionMet,
      },
    };
  }

  /**
   * Execute AI node
   */
  private static async executeAI(
    node: FlowNode,
    state: ConversationState,
    whatsappClient: WhatsAppClient,
    phoneNumber: string
  ): Promise<NodeExecutionResult> {
    const config = node.data.config;
    const userMessage = state.lastUserMessage || '';

    if (!userMessage) {
      console.error('AI node: No user message to respond to');
      return { nextNodeId: null, shouldPause: false };
    }

    try {
      // Build context from conversation history
      const contextMessages = state.history
        .slice(-10)
        .map((h) => {
          // In real implementation, get node data from flow
          return ''; // Simplified
        })
        .filter(Boolean)
        .join('\n');

      const systemPrompt =
        config.ai_prompt ||
        `Du bist ein hilfreicher WhatsApp Bot Assistent. Antworte kurz und freundlich auf Deutsch.`;

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        throw new Error('GROQ API Key not configured');
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: config.ai_model || 'llama-3.3-70b-versatile', // Updated: llama-3.1-70b-versatile was decommissioned
          messages: [
            {
              role: 'system',
              content: systemPrompt + (contextMessages ? `\n\nKontext:\n${contextMessages}` : ''),
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!groqResponse.ok) {
        throw new Error(`GROQ API Error: ${groqResponse.status}`);
      }

      const data = await groqResponse.json();
      const aiResponse = data.choices[0].message.content;

      await whatsappClient.sendTextMessage(phoneNumber, aiResponse);

      return { nextNodeId: null, shouldPause: false };
    } catch (error: any) {
      console.error('Error in AI node:', error);
      const errorMessage = config.error_message || 'Entschuldigung, ein Fehler ist aufgetreten.';
      await whatsappClient.sendTextMessage(phoneNumber, errorMessage);
      return { nextNodeId: null, shouldPause: false };
    }
  }

  /**
   * Execute end node
   */
  private static executeEnd(): NodeExecutionResult {
    return { nextNodeId: null, shouldPause: false };
  }
}

