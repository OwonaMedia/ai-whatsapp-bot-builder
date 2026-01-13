import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { FlowExecutor } from '@/lib/bot/flowExecutor';
import { StateManager } from '@/lib/bot/stateManager';

/**
 * Web Chat API Endpoint
 * Handles messages from web chat widget
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', params.id)
      .eq('status', 'active')
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot not found or not active' },
        { status: 404 }
      );
    }

    // Get active flow
    const { data: flowData } = await supabase
      .from('bot_flows')
      .select('*')
      .eq('bot_id', params.id)
      .eq('is_active', true)
      .single();

    if (!flowData) {
      return NextResponse.json(
        { error: 'No active flow found' },
        { status: 404 }
      );
    }

    // Find or create conversation for web chat
    // Use sessionId as identifier (anonymized)
    const sessionHash = await hashSessionId(sessionId);
    
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('bot_id', params.id)
      .eq('phone_hash', sessionHash)
      .single();

    if (!conversation) {
      // Create new conversation for web chat
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          bot_id: params.id,
          whatsapp_number: `web_${sessionId}`, // Prefix for web chats
          phone_hash: sessionHash,
          consent_given: true, // User initiated
          consent_timestamp: new Date().toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;
      conversation = newConversation;
    }

    // Save incoming message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_type: 'text',
      content: message,
      created_at: new Date().toISOString(),
    });

    // Get or create conversation state
    await StateManager.updateWithUserMessage(conversation.id, message);
    const state = await StateManager.getOrCreateState(conversation.id, bot.id);

    // Create a mock WhatsApp client for web chat (messages will be returned, not sent via WhatsApp)
    const { WebChatClient } = await import('@/lib/bot/webChatClient');
    const webChatClient = new WebChatClient();

    // Collect responses from bot
    const responses: string[] = [];
    webChatClient.onMessage = (msg: string) => {
      responses.push(msg);
    };

    const flow = flowData.flow_data as any;
    const executor = new FlowExecutor(
      flow,
      {
        ...state,
        lastUserMessage: message,
      },
      webChatClient,
      `web_${sessionId}`
    );

    // Check if waiting for question response
    if (state.variables?.waitingForQuestionNodeId) {
      // Handle question response
      await executor.handleQuestionResponse(message);
      // After handling, execute continues automatically
      await executor.execute();
    } else {
      // Normal flow execution
      await executor.execute();
    }
    
    // Also check queued messages (in case onMessage wasn't called)
    const queuedMessages = webChatClient.getQueuedMessages();
    if (queuedMessages.length > 0 && responses.length === 0) {
      responses.push(...queuedMessages);
      webChatClient.clearQueue();
    }

    // If no responses, add a default message
    if (responses.length === 0) {
      responses.push('Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Bitte versuche es später erneut.');
    }

    // Return responses to web widget
    return NextResponse.json({
      success: true,
      responses: responses,
      sessionId: sessionId,
    });
  } catch (error: any) {
    console.error('Web chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}

async function hashSessionId(sessionId: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = process.env.WHATSAPP_SALT || 'default-salt';
  const data = encoder.encode(sessionId + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

