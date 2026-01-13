'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  ticketId?: string;
}

export default function MCPSupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const { addToast } = useToast();

  // Hydration-Sicherheit: Mit ssr: false wird diese Komponente NUR auf dem Client gerendert
  // Aber als zusätzliche Sicherheit: mounted State + useEffect für initiale Message
  useEffect(() => {
    setMounted(true);
    // Setze initiale Message nach Mount, um Hydration-Mismatch zu vermeiden
    // new Date() wird nur im Client aufgerufen, nicht während SSR
    setMessages([
      {
        id: '1',
        type: 'assistant',
        content: 'Hallo! 👋 Ich bin dein Support-Assistent. Wie kann ich dir helfen?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Erstelle Historie BEVOR wir die neue Nachricht hinzufügen
    const historyBeforeNewMessage = messages
      .filter((m) => m.type !== 'system') // Filtere System-Nachrichten raus
      .slice(-10) // Letzte 10 Nachrichten (ohne die aktuelle)
      .map((m) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    // Debug: Log die Historie
    console.log('[MCPSupportChatbot] Conversation History:', historyBeforeNewMessage);

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: user?.id,
          locale,
          conversationHistory: historyBeforeNewMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('[MCPSupportChatbot] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || `Chat-Anfrage fehlgeschlagen (${response.status})`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'Entschuldigung, ich konnte deine Anfrage nicht verarbeiten.',
        timestamp: new Date(),
        ticketId: data.ticketId,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Wenn ein Ticket erstellt wurde, informiere den Nutzer
      if (data.ticketId) {
        addToast({
          type: 'success',
          title: 'Ticket erstellt',
          message: `Dein Problem wurde als Ticket #${data.ticketId.substring(0, 8)} erstellt.`,
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut oder erstelle ein Ticket über das Support-Formular.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Die Chat-Anfrage konnte nicht verarbeitet werden.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: Log nur in useEffect, nicht während Render (verhindert Hydration-Mismatch)
  useEffect(() => {
    if (mounted) {
      console.log('[MCPSupportChatbot] Komponente gerendert, isOpen:', isOpen);
    }
  }, [isOpen, mounted]);

  // Hydration-Sicherheit: Nicht rendern bis nach Mount
  // Dies verhindert, dass React versucht, die Komponente während SSR zu rendern
  if (!mounted) {
    return null;
  }

  // WICHTIG: suppressHydrationWarning nur auf dem äußersten Container
  // Dies verhindert Hydration-Warnungen für diese Client-only Komponente
  return (
    <div 
      id="mcp-support-chatbot-container"
      suppressHydrationWarning={true}
      style={{ 
        position: 'fixed', 
        bottom: '24px', 
        right: '24px', 
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
    >
      {/* Chatbot Toggle Button - Immer sichtbar wenn geschlossen */}
      {!isOpen && (
        <button
          onClick={() => {
            console.log('[MCPSupportChatbot] Button geklickt');
            setIsOpen(true);
          }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
          aria-label="Support Chatbot öffnen"
          style={{ 
            backgroundColor: '#10b981', // brand-green fallback
            minWidth: '64px',
            minHeight: '64px',
          }}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div 
          className="flex h-[600px] w-[400px] flex-col rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl"
          style={{ 
            backgroundColor: '#1e293b', // slate-800 fallback
            minWidth: '400px',
            minHeight: '600px',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-brand-green px-6 py-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Support Chatbot</h3>
                <p className="text-xs text-white/80">MCP Support System</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white transition hover:bg-white/20 focus:outline-none"
              aria-label="Chatbot schließen"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-brand-green text-white'
                      : message.type === 'system'
                      ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.ticketId && (
                    <p className="mt-1 text-xs opacity-70">
                      Ticket: #{message.ticketId.substring(0, 8)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-700 px-4 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-slate-700 p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Schreibe eine Nachricht..."
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 text-slate-100 px-4 py-2 text-sm placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-lg bg-brand-green px-4 py-2 text-white transition hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Der Chatbot nutzt das MCP Support System und kann automatisch Tickets erstellen.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

