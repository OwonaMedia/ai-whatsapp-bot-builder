import { BotFlow, FlowNode, FlowEdge, NodeType } from '@/types/bot';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { createClient } from '@/lib/supabase';
import { StateManager } from './stateManager';
import { ConversationState } from './types';

export class FlowExecutor {
  private flow: BotFlow;
  private state: ConversationState;
  private whatsappClient: WhatsAppClient;
  private phoneNumber: string;

  constructor(
    flow: BotFlow,
    state: ConversationState,
    whatsappClient: WhatsAppClient,
    phoneNumber: string
  ) {
    this.flow = flow;
    this.state = state;
    this.whatsappClient = whatsappClient;
    this.phoneNumber = phoneNumber;
  }

  /**
   * Execute the flow from current state
   */
  async execute(): Promise<void> {
    let currentNodeId = this.state.currentNodeId;

    // If no current node, find trigger node
    if (!currentNodeId) {
      const triggerNode = this.flow.nodes.find((n) => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found in flow');
      }
      currentNodeId = triggerNode.id;
    }

    // Execute nodes until we hit an end node or wait node
    let maxIterations = 100; // Prevent infinite loops
    while (currentNodeId && maxIterations > 0) {
      const node = this.flow.nodes.find((n) => n.id === currentNodeId);
      if (!node) {
        console.error(`Node ${currentNodeId} not found`);
        break;
      }

      // Execute node
      const nextNodeId = await this.executeNode(node);

      // Update state
      this.state.currentNodeId = nextNodeId;
      this.state.history.push({
        nodeId: node.id,
        timestamp: new Date().toISOString(),
      });
      this.state.updatedAt = new Date().toISOString();

      // Update state in database
      await StateManager.updateState(this.state);

      // If node returns null, flow is complete
      if (!nextNodeId) break;

      currentNodeId = nextNodeId;
      maxIterations--;
    }

    if (maxIterations === 0) {
      console.error('Max iterations reached, possible infinite loop');
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: FlowNode): Promise<string | null> {
    switch (node.type) {
      case 'trigger':
        return this.executeTriggerNode(node);
      case 'message':
        return this.executeMessageNode(node);
      case 'question':
        return this.executeQuestionNode(node);
      case 'condition':
        return this.executeConditionNode(node);
      case 'ai':
        return this.executeAINode(node);
      case 'end':
        return this.executeEndNode(node);
      default:
        console.error(`Unknown node type: ${node.type}`);
        return this.getNextNode(node.id);
    }
  }

  /**
   * Execute trigger node
   */
  private async executeTriggerNode(node: FlowNode): Promise<string | null> {
    const config = node.data.config;
    const triggerType = config.trigger_type || 'whatsapp_message';

    // Trigger nodes don't send messages, they just start the flow
    // The actual trigger happens when a message is received
    return this.getNextNode(node.id);
  }

  /**
   * Execute message node - send a text message
   */
  private async executeMessageNode(node: FlowNode): Promise<string | null> {
    const config = node.data.config;
    const messageText = config.message_text || node.data.label;

    if (!messageText) {
      console.error('Message node has no text');
      return this.getNextNode(node.id);
    }

    try {
      await this.whatsappClient.sendTextMessage(this.phoneNumber, messageText);

      // Save message to database
      await this.saveMessage('outbound', 'text', messageText);

      return this.getNextNode(node.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Handle error based on config
      if (config.error_handling === 'end') {
        return null;
      }
      return this.getNextNode(node.id);
    }
  }

  /**
   * Execute question node - send a question with options
   */
  private async executeQuestionNode(node: FlowNode): Promise<string | null> {
    const config = node.data.config;
    const questionText = config.question_text || node.data.label;
    const options = config.options || [];

    if (!questionText) {
      console.error('Question node has no text');
      return this.getNextNode(node.id);
    }

    try {
      if (options.length > 0 && options.length <= 3) {
        // Use interactive buttons
        await this.whatsappClient.sendInteractiveMessage(
          this.phoneNumber,
          questionText,
          options.map((opt) => ({
            id: opt.id || opt.value,
            title: opt.label || opt.value,
          }))
        );
      } else {
        // Fallback to text message
        await this.whatsappClient.sendTextMessage(this.phoneNumber, questionText);
      }

      // Save message to database
      await this.saveMessage('outbound', 'text', questionText);

      // Question nodes wait for user response
      // Store question node ID in state to handle response later
      this.state.variables = {
        ...this.state.variables,
        waitingForQuestionNodeId: node.id,
        questionOptions: options,
      };

      // Return null to pause flow - response handler will continue
      return null;
    } catch (error: any) {
      console.error('Error sending question:', error);
      return this.getNextNode(node.id);
    }
  }

  /**
   * Handle user response to a question node
   */
  async handleQuestionResponse(userResponse: string): Promise<void> {
    const waitingNodeId = this.state.variables?.waitingForQuestionNodeId;
    if (!waitingNodeId) {
      // Not waiting for response, treat as normal message
      return;
    }

    const waitingNode = this.flow.nodes.find((n) => n.id === waitingNodeId);
    if (!waitingNode || waitingNode.type !== 'question') {
      console.error('Waiting node not found or not a question node');
      return;
    }

    const config = waitingNode.data.config;
    const options = config.options || [];

    // Find matching option
    let matchedOption = options.find(
      (opt) =>
        opt.id === userResponse ||
        opt.value === userResponse ||
        opt.label?.toLowerCase() === userResponse.toLowerCase()
    );

    // If custom responses allowed and no match, use default
    if (!matchedOption && config.allow_custom_response) {
      matchedOption = options.find((opt) => opt.value === 'default') || options[0];
    }

    // Store user response in variables
    this.state.variables = {
      ...this.state.variables,
      lastQuestionResponse: userResponse,
      lastQuestionMatch: matchedOption?.value || userResponse,
    };

    // Remove waiting state
    delete this.state.variables.waitingForQuestionNodeId;
    delete this.state.variables.questionOptions;

    // Find next node based on response
    // Option 1: Edge with matching label/value
    const edges = this.flow.edges.filter((e) => e.source === waitingNodeId);
    const responseEdge = edges.find(
      (e) => e.label === matchedOption?.id || e.label === matchedOption?.value
    );

    if (responseEdge) {
      this.state.currentNodeId = responseEdge.target;
    } else {
      // Default: continue to first next node
      this.state.currentNodeId = this.getNextNode(waitingNodeId);
    }

    // Continue execution from new node
    await this.execute();
  }

  /**
   * Execute condition node - evaluate condition and route
   */
  private async executeConditionNode(node: FlowNode): Promise<string | null> {
    const config = node.data.config;
    const conditionType = config.condition_type || 'equals';
    const conditionField = config.condition_field || 'last_message';
    const conditionValue = config.condition_value || '';

    // Get value to compare
    let valueToCompare: string;
    if (conditionField === 'last_message') {
      valueToCompare = this.state.lastUserMessage || '';
    } else {
      valueToCompare = this.state.variables[conditionField] || '';
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

    // Route to TRUE or FALSE branch
    const edges = this.flow.edges.filter((e) => e.source === node.id);
    const trueEdge = edges.find((e) => e.sourceHandle === 'true');
    const falseEdge = edges.find((e) => e.sourceHandle === 'false');

    if (conditionMet && trueEdge) {
      return trueEdge.target;
    } else if (!conditionMet && falseEdge) {
      return falseEdge.target;
    }

    // Default: continue to next node
    return this.getNextNode(node.id);
  }

  /**
   * Execute AI node - generate AI response
   */
  private async executeAINode(node: FlowNode): Promise<string | null> {
    const config = node.data.config;
    const userMessage = this.state.lastUserMessage || '';

    if (!userMessage) {
      console.error('AI node: No user message to respond to');
      return this.getNextNode(node.id);
    }

    try {
      // Build context from conversation history
      const contextMessages = this.state.history
        .slice(-10)
        .map((h) => {
          const node = this.flow.nodes.find((n) => n.id === h.nodeId);
          return node?.data.config?.message_text || node?.data.label;
        })
        .filter(Boolean)
        .join('\n');

      // Build system prompt
      const systemPrompt = config.ai_prompt || `Du bist ein hilfreicher WhatsApp Bot Assistent. Antworte kurz und freundlich auf Deutsch.`;

      // Get bot-specific knowledge sources
      const supabase = createClient();
      const { data: botSources } = await supabase
        .from('knowledge_sources')
        .select('id')
        .eq('bot_id', this.state.botId)
        .eq('status', 'ready');

      const sourceIds = botSources?.map((s: { id: string }) => s.id) || [];

      // Get RAG context from knowledge sources
      let ragContext = '';
      if (sourceIds.length > 0) {
        try {
          const embeddingResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/knowledge/embeddings`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: userMessage }),
            }
          );

          if (embeddingResponse.ok) {
            const { embedding } = await embeddingResponse.json();
            const { data: chunks } = await supabase.rpc('match_document_chunks', {
              query_embedding: embedding,
              match_threshold: 0.7,
              match_count: 5,
              source_ids: sourceIds.length > 0 ? sourceIds : [],
            });

            if (chunks && chunks.length > 0) {
              ragContext = chunks.map((chunk: any) => chunk.content).join('\n\n');
            }
          }
        } catch (error) {
          console.error('Error fetching RAG context:', error);
        }
      }

      // Call GROQ API
      const configAny = config as any;
      const groqApiKey = process.env.GROQ_API_KEY || configAny?.ai?.groqApiKey;
      if (!groqApiKey) {
        throw new Error('GROQ API Key not configured');
      }

      const fullContext = [
        systemPrompt,
        contextMessages ? `\n\nConversation History:\n${contextMessages}` : '',
        ragContext ? `\n\nRelevant Knowledge:\n${ragContext}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: config.ai_model || 'llama-3.3-70b-versatile', // Updated: llama-3.1-70b-versatile was decommissioned
          messages: [
            {
              role: 'system',
              content: fullContext,
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

      // Send AI response
      await this.whatsappClient.sendTextMessage(this.phoneNumber, aiResponse);

      // Save message to database
      await this.saveMessage('outbound', 'text', aiResponse);

      return this.getNextNode(node.id);
    } catch (error: any) {
      console.error('Error in AI node:', error);
      const errorMessage = config.error_message || 'Entschuldigung, ein Fehler ist aufgetreten.';
      await this.whatsappClient.sendTextMessage(this.phoneNumber, errorMessage);
      return this.getNextNode(node.id);
    }
  }

  /**
   * Execute end node - end conversation
   */
  private async executeEndNode(_node: FlowNode): Promise<null> {
    // Mark conversation as completed
    const supabase = createClient();
    await supabase
      .from('conversations')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', this.state.conversationId);

    return null; // Flow ends
  }

  /**
   * Get next node ID from current node
   */
  private getNextNode(nodeId: string): string | null {
    const edge = this.flow.edges.find((e) => e.source === nodeId);
    return edge?.target || null;
  }


  /**
   * Save message to database
   */
  private async saveMessage(
    direction: 'inbound' | 'outbound',
    type: string,
    content: string
  ): Promise<void> {
    const supabase = createClient();
    await supabase.from('messages').insert({
      conversation_id: this.state.conversationId,
      direction,
      message_type: type,
      content,
      created_at: new Date().toISOString(),
    });
  }
}

