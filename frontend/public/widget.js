/**
 * WhatsApp Bot Builder - Web Chat Widget
 * Embed this script on your website to add the chat widget
 * 
 * Usage:
 * <script src="https://whatsapp.owona.de/widget.js" data-bot-id="YOUR_BOT_ID"></script>
 */

(function() {
  'use strict';

  // Get bot ID from script tag
  const scriptTag = document.currentScript;
  const botId = scriptTag?.getAttribute('data-bot-id');
  const apiUrl = scriptTag?.getAttribute('data-api-url') || 'https://whatsapp.owona.de';

  if (!botId) {
    console.error('Bot ID is required. Add data-bot-id attribute to script tag.');
    return;
  }

  // Generate session ID
  let sessionId = sessionStorage.getItem(`bot_${botId}_session`);
  if (!sessionId) {
    sessionId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(`bot_${botId}_session`, sessionId);
  }

  // Widget HTML
  const widgetHTML = `
    <div id="bot-widget-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- Chat Window -->
      <div id="bot-widget-window" style="display: none; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); flex-direction: column; overflow: hidden;">
        <!-- Header -->
        <div style="background: #25D366; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600; font-size: 16px;">Chat Support</div>
            <div style="font-size: 12px; opacity: 0.9;">Wir sind online</div>
          </div>
          <button id="bot-widget-close" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
        </div>
        
        <!-- Messages Area -->
        <div id="bot-widget-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f5f5f5;">
          <div style="text-align: center; color: #666; font-size: 14px; padding: 20px;">
            Willkommen! 👋<br/>
            Wie kann ich dir helfen?
          </div>
        </div>
        
        <!-- Input Area -->
        <div style="padding: 12px; background: white; border-top: 1px solid #e0e0e0;">
          <div style="display: flex; gap: 8px;">
            <input 
              id="bot-widget-input" 
              type="text" 
              placeholder="Nachricht eingeben..."
              style="flex: 1; padding: 10px; border: 1px solid #e0e0e0; border-radius: 20px; outline: none; font-size: 14px;"
            />
            <button 
              id="bot-widget-send" 
              style="background: #25D366; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px;"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
      
      <!-- Toggle Button -->
      <button 
        id="bot-widget-toggle" 
        style="width: 60px; height: 60px; border-radius: 50%; background: #25D366; border: none; color: white; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(37,211,102,0.4); display: flex; align-items: center; justify-content: center;"
      >
        💬
      </button>
    </div>
  `;

  // Inject widget HTML
  const container = document.createElement('div');
  container.innerHTML = widgetHTML;
  document.body.appendChild(container);

  const widgetWindow = document.getElementById('bot-widget-window');
  const widgetToggle = document.getElementById('bot-widget-toggle');
  const widgetClose = document.getElementById('bot-widget-close');
  const messagesArea = document.getElementById('bot-widget-messages');
  const inputField = document.getElementById('bot-widget-input');
  const sendButton = document.getElementById('bot-widget-send');

  let isLoading = false;

  // Toggle chat window
  widgetToggle?.addEventListener('click', function() {
    if (widgetWindow) {
      widgetWindow.style.display = widgetWindow.style.display === 'none' ? 'flex' : 'none';
      widgetToggle.style.display = widgetWindow.style.display === 'flex' ? 'none' : 'flex';
    }
  });

  widgetClose?.addEventListener('click', function() {
    if (widgetWindow) {
      widgetWindow.style.display = 'none';
      if (widgetToggle) widgetToggle.style.display = 'flex';
    }
  });

  // Add message to chat
  function addMessage(text, isUser = false) {
    if (!messagesArea) return;

    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin-bottom: 12px;
      display: flex;
      ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;

    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      ${isUser 
        ? 'background: #25D366; color: white; border-bottom-right-radius: 4px;' 
        : 'background: white; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);'
      }
    `;
    messageBubble.textContent = text;

    messageDiv.appendChild(messageBubble);
    messagesArea.appendChild(messageDiv);

    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  // Send message
  async function sendMessage() {
    const input = inputField;
    if (!input || !input.value || !input.value.trim() || isLoading) return;

    const message = input.value.trim();
    input.value = '';

    // Add user message to chat
    addMessage(message, true);

    // Show loading indicator
    isLoading = true;
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'bot-widget-loading';
    loadingDiv.style.cssText = `
      margin-bottom: 12px;
      display: flex;
      justify-content: flex-start;
    `;
    const loadingBubble = document.createElement('div');
    loadingBubble.style.cssText = `
      padding: 10px 14px;
      background: white;
      border-radius: 12px;
      font-size: 14px;
      color: #666;
    `;
    loadingBubble.textContent = 'Tippt...';
    loadingDiv.appendChild(loadingBubble);
    if (messagesArea) messagesArea.appendChild(loadingDiv);

    try {
      const response = await fetch(`${apiUrl}/api/bots/${botId}/webchat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
        }),
      });

      // Remove loading indicator
      loadingDiv.remove();

      if (response.ok) {
        const data = await response.json();
        
        // Add bot responses
        if (data.responses && data.responses.length > 0) {
          data.responses.forEach(function(response) {
            addMessage(response, false);
          });
        } else {
          addMessage('Entschuldigung, ich konnte deine Nachricht nicht verarbeiten.', false);
        }
      } else {
        throw new Error('Request failed');
      }
    } catch (error) {
      loadingDiv.remove();
      addMessage('Es gab ein Problem. Bitte versuche es später erneut.', false);
      console.error('Widget error:', error);
    } finally {
      isLoading = false;
    }
  }

  // Event listeners
  sendButton?.addEventListener('click', sendMessage);
  inputField?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();

