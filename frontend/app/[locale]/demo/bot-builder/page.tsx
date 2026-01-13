'use client';
export const dynamic = 'force-dynamic';

/**
 * DEMO-SEITE: Bot Builder
 * Voll funktionsfähiger Demo-Modus - Alle Funktionen sind aktiv mit ECHTEN Supabase-Verbindungen
 * Verwendet echte Datenbank-Operationen, aber mit Demo-User oder Demo-Flag
 */

import { useState, useEffect, ErrorInfo, Component } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase';
import BotBuilder from '@/components/bot-builder/BotBuilder';
import { BotFlow } from '@/types/bot';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: React.ReactNode; locale?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; locale?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BotBuilderDemoPage Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const locale = this.props.locale || 'de';
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Etwas ist schiefgelaufen</h1>
            <p className="text-gray-600 mb-4">
              Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.
            </p>
            {this.state.error && (
              <p className="text-sm text-gray-500 mb-4 font-mono">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Erneut versuchen
              </Button>
              <Link href={`/${locale}/demo/dashboard`}>
                <Button variant="outline">Zur Startseite</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function BotBuilderDemoPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [demoBotId, setDemoBotId] = useState<string | null>(null);
  const [initialFlow, setInitialFlow] = useState<BotFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo-User-ID: Verwende eine feste Demo-User-ID für alle Demo-Bots
  // In Produktion würde hier ein Demo-User in Supabase erstellt werden
  const DEMO_USER_ID = 'demo-user-demo-mode-12345';

  useEffect(() => {
    setMounted(true);
    const botId = searchParams.get('botId');
    setDemoBotId(botId);
    
    // Lade Demo-Bot wenn botId vorhanden
    if (botId) {
      loadDemoBot(botId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadDemoBot = async (botId: string) => {
    try {
      const supabase = createClient();
      
      // Lade Bot aus Supabase (Demo-Bots haben user_id = DEMO_USER_ID oder is_demo = true)
      const { data, error: queryError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .or(`user_id.eq.${DEMO_USER_ID},is_demo.eq.true`)
        .single();

      if (queryError) {
        console.error('Error loading demo bot:', queryError);
        // Wenn Bot nicht gefunden, versuche es mit Demo-Flag
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('bots')
          .select('*')
          .eq('id', botId)
          .single();
        
        if (fallbackError || !fallbackData) {
          setError('Demo-Bot konnte nicht geladen werden');
          addToast({
            type: 'error',
            title: 'Fehler',
            message: 'Demo-Bot konnte nicht geladen werden',
          });
          setLoading(false);
          return;
        }
        
        // Verwende fallbackData
        if (fallbackData.bot_config || fallbackData.flow) {
          setInitialFlow((fallbackData.bot_config || fallbackData.flow) as BotFlow);
        }
        setLoading(false);
        return;
      }

      if (data && (data.bot_config || data.flow)) {
        setInitialFlow((data.bot_config || data.flow) as BotFlow);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading demo bot:', err);
      setError(err.message || 'Fehler beim Laden des Demo-Bots');
      addToast({
        type: 'error',
        title: 'Fehler',
        message: err.message || 'Fehler beim Laden des Demo-Bots',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFlowChange = (flow: BotFlow) => {
    // Flow-Änderungen werden automatisch vom BotBuilder-Komponenten gehandhabt
    // Hier können wir optional Auto-Save implementieren
  };

  // Diese Funktion wird nicht direkt verwendet, da BotBuilder selbst speichert
  // Aber wir können sie für zukünftige Erweiterungen behalten

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Demo-Bot-Builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="primary"
              onClick={() => {
                setError(null);
                setLoading(true);
                if (demoBotId) {
                  loadDemoBot(demoBotId);
                } else {
                  setLoading(false);
                }
              }}
            >
              Erneut versuchen
            </Button>
            <Link href={`/${locale}/demo/dashboard`}>
              <Button variant="outline">Zur Startseite</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary locale={locale}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Demo Mode Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <div className="container mx-auto flex items-center">
            <span className="text-xl mr-2">🎭</span>
            <p className="text-sm text-yellow-800">
              <strong>Demo-Modus mit echten Funktionen:</strong> Alle Aktionen werden in Supabase gespeichert. 
              <Link href={`/${locale}/auth/signup`} className="ml-2 underline font-semibold">
                Registrieren für persönliche Bots →
              </Link>
            </p>
          </div>
        </div>

        {/* Echter BotBuilder mit Demo-Modus - funktioniert OHNE Auth */}
        <BotBuilder
          mode={demoBotId ? 'edit' : 'create'}
          botId={demoBotId || undefined}
          initialFlow={initialFlow || undefined}
          onFlowChange={handleFlowChange}
          demoMode={true}
          demoUserId={DEMO_USER_ID}
        />
      </div>
    </ErrorBoundary>
  );
}


