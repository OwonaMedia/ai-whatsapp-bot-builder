'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * iframe Embed Page für vollständige Widget-Isolation
 * Verwendung: <iframe src="/widget/embed?botId=YOUR_BOT_ID"></iframe>
 */
export default function WidgetEmbedPage() {
  const searchParams = useSearchParams();
  const botId = searchParams.get('botId');
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !botId) {
      setError('Bot-ID fehlt');
      return;
    }

    // Load widget script
    const script = document.createElement('script');
    script.src = `${window.location.origin}/widget.js`;
    script.setAttribute('data-bot-id', botId);
    script.setAttribute('data-api-url', window.location.origin);
    script.async = true;

    script.onload = () => {
      setError(null);
    };

    script.onerror = () => {
      setError('Widget konnte nicht geladen werden');
    };

    document.body.appendChild(script);

    return () => {
      const widgetContainer = document.getElementById('bot-widget-container');
      const scriptTag = document.querySelector(`script[data-bot-id="${botId}"]`);
      if (widgetContainer) widgetContainer.remove();
      if (scriptTag) scriptTag.remove();
    };
  }, [mounted, botId]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">Lade Widget...</div>
      </div>
    );
  }

  if (!botId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-red-500">❌ Bot-ID fehlt. Verwende: ?botId=YOUR_BOT_ID</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-red-500">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50">
      {/* Widget wird automatisch geladen */}
    </div>
  );
}
