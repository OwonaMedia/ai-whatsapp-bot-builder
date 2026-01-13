'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase';

export default function DataDeletion() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dataSummary, setDataSummary] = useState<any>(null);

  const loadDataSummary = async () => {
    try {
      const response = await fetch('/api/user/data-deletion', {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setDataSummary(data);
      }
    } catch (error) {
      console.error('Error loading data summary:', error);
    }
  };

  useEffect(() => {
    loadDataSummary();
  }, []);

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/data-deletion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Löschung fehlgeschlagen');
      }

      addToast({
        type: 'success',
        title: 'Daten gelöscht',
        message: 'Ihre Daten wurden erfolgreich gelöscht. Sie werden nun abgemeldet.',
        duration: 5000,
      });

      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Die Löschung konnte nicht durchgeführt werden.',
      });
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Daten löschen (DSGVO Art. 17)
      </h2>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-800 font-semibold mb-2">
          ⚠️ WICHTIG: Endgültige Löschung
        </p>
        <p className="text-sm text-red-700">
          Wenn Sie Ihre Daten löschen, werden <strong>alle</strong> Ihre Daten unwiderruflich entfernt:
        </p>
        <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
          <li>Ihr Nutzerkonto</li>
          <li>Alle Ihre Bots ({dataSummary?.dataSummary?.bots || 0})</li>
          <li>Alle Wissensquellen ({dataSummary?.dataSummary?.knowledgeSources || 0})</li>
          <li>Alle Chat-Verläufe ({dataSummary?.dataSummary?.chatSessions || 0})</li>
          <li>Alle Konfigurationen</li>
        </ul>
        <p className="text-sm text-red-700 mt-2">
          Diese Aktion kann <strong>nicht rückgängig gemacht werden</strong>.
        </p>
      </div>

      {!showConfirm ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sie haben das Recht, die Löschung Ihrer personenbezogenen Daten zu verlangen (Art. 17 DSGVO).
          </p>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isLoading}
          >
            Daten löschen anfordern
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-semibold mb-2">
              Bestätigung erforderlich
            </p>
            <p className="text-sm text-amber-700">
              Bitte bestätigen Sie, dass Sie wirklich alle Ihre Daten löschen möchten.
              Diese Aktion ist <strong>endgültig und unwiderruflich</strong>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isLoading}
            >
              {isLoading ? 'Löschen...' : 'Ja, endgültig löschen'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Bei Fragen zur Datenlöschung kontaktieren Sie uns bitte unter:{' '}
          <a href="mailto:shop@owona.de" className="text-brand-green hover:underline">
            shop@owona.de
          </a>
        </p>
      </div>
    </div>
  );
}

