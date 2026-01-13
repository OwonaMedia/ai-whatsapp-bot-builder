'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BotDetail from '@/components/bots/BotDetail';
import { createClient } from '@/lib/supabase';
import { Bot } from '@/types/bot';
import { getErrorMessage } from '@/lib/utils';

export default function BotDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const router = useRouter();
  // ✅ FIX: useTranslations entfernt - verursacht Server-Side Rendering Fehler
  // Verwende stattdessen direkten Text
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [botId, setBotId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    // ✅ Resolve params async - handle both Promise and direct object
    const resolveParams = async () => {
      try {
        const resolvedParams = await Promise.resolve(params);
        if (resolvedParams && typeof resolvedParams === 'object' && 'id' in resolvedParams) {
          setBotId(resolvedParams.id);
        } else if (typeof params === 'object' && params !== null && 'id' in params) {
          // Fallback: params might already be resolved
          setBotId((await params).id);
        }
      } catch (err) {
        console.error('Error resolving params:', err);
      }
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!mounted || !botId) return;

    const loadBot = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data, error } = await supabase
          .from('bots')
          .select('*')
          .eq('id', botId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading bot:', error);
          setError('Bot nicht gefunden');
          return;
        }

        setBot(data as Bot);
      } catch (err: unknown) {
        console.error('Error loading bot:', err);
        setError(getErrorMessage(err) || 'Fehler beim Laden des Bots');
      } finally {
        setLoading(false);
      }
    };

    loadBot();
  }, [mounted, botId, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-screen">
            <div className="text-gray-500">Lade...</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-screen">
            <div className="text-gray-500">Bot wird geladen...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Bot nicht gefunden
            </h1>
            <p className="text-gray-600 mb-6">
              {error || 'Der angeforderte Bot konnte nicht gefunden werden.'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90"
            >
              Zurück zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <BotDetail bot={bot} />;
}

