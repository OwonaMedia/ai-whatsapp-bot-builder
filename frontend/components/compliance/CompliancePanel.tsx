'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ComplianceCheck, UseCaseType } from '@/lib/compliance/checker';
import ComplianceBadge from './ComplianceBadge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface CompliancePanelProps {
  botId: string;
  currentUseCase?: string | null;
}

const USE_CASE_OPTIONS = [
  { value: 'customer_service', label: 'Kundenservice / Support', icon: '💬' },
  { value: 'booking', label: 'Buchungen / Reservierungen', icon: '📅' },
  { value: 'ecommerce', label: 'E-Commerce / Shop', icon: '🛒' },
  { value: 'information', label: 'Informationen / News', icon: '📰' },
];

export default function CompliancePanel({ botId, currentUseCase }: CompliancePanelProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  // ✅ Fix Hydration: Warte bis Client-seitig gerendert
  const [mounted, setMounted] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<string>('');

  // ✅ Fix Hydration: Initialisiere nur client-seitig
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      if (currentUseCase) {
        setSelectedUseCase(currentUseCase);
      }
      loadCompliance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  const loadCompliance = async () => {
    if (!mounted) return; // ✅ Warte bis mounted
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bots/${botId}/compliance`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setCompliance(data);
        setSelectedUseCase(data.useCaseType || currentUseCase || '');
      } else if (response.status === 401) {
        // ✅ 401 ist OK - Benutzer ist möglicherweise nicht eingeloggt (z.B. in Demo)
        console.log('Compliance check skipped: User not authenticated');
        setCompliance(null);
      }
    } catch (error) {
      // ✅ Fehler stillschweigend behandeln (nicht kritisch)
      console.error('Error loading compliance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUseCase = async () => {
    if (!selectedUseCase) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte wähle einen Use-Case aus',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/bots/${botId}/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: selectedUseCase }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompliance(data.compliance);
        addToast({
          type: 'success',
          title: 'Erfolg',
          message: 'Use-Case aktualisiert',
        });
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Use-Case konnte nicht aktualisiert werden',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ Fix Hydration: Rendere nichts bis mounted (verhindert SSR/Client Mismatch)
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-400 text-sm">Lade...</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!compliance) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Meta WhatsApp Compliance
        </h2>
        <ComplianceBadge compliance={compliance} />
      </div>

      {/* Use Case Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Use-Case (erforderlich für Meta Compliance)
        </label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {USE_CASE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedUseCase(option.value)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedUseCase === option.value
                  ? 'border-brand-green bg-brand-light/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
        <Button
          onClick={handleUpdateUseCase}
          isLoading={isUpdating}
          disabled={selectedUseCase === currentUseCase}
          variant="primary"
          size="sm"
        >
          Use-Case speichern
        </Button>
      </div>

      {/* Warnings */}
      {compliance.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Warnungen</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            {compliance.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {compliance.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Vorschläge</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            {compliance.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-semibold mb-1">ℹ️ Meta WhatsApp Richtlinien (ab 15. Jan 2026)</p>
        <p>
          Allgemeine Konversations-Chatbots sind nicht mehr erlaubt. Bots müssen einen spezifischen
          Business-Use-Case haben (z.B. Kundenservice, Buchungen, E-Commerce).
        </p>
      </div>
    </div>
  );
}

