'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface WidgetCodeGeneratorProps {
  botId: string;
}

export default function WidgetCodeGenerator({ botId }: WidgetCodeGeneratorProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  const widgetUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://whatsapp.owona.de';

  const embedCode = `<script src="${widgetUrl}/widget.js" data-bot-id="${botId}"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Kopiert!',
        message: 'Embed-Code wurde in die Zwischenablage kopiert.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Code konnte nicht kopiert werden.',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Widget Embed-Code
        </label>
        <div className="flex gap-2">
          <code className="flex-1 p-3 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono break-all">
            {embedCode}
          </code>
          <Button
            variant="outline"
            onClick={handleCopy}
            size="sm"
          >
            {copied ? '✓ Kopiert' : '📋 Kopieren'}
          </Button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Installation:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Kopiere den Code oben</li>
          <li>Füge ihn vor dem schließenden &lt;/body&gt; Tag deiner Website ein</li>
          <li>Das Widget erscheint automatisch auf deiner Seite</li>
        </ol>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Hinweis:</h4>
        <p className="text-sm text-yellow-800">
          Stelle sicher, dass dein Bot aktiv ist, damit das Widget funktioniert.
        </p>
      </div>
    </div>
  );
}

