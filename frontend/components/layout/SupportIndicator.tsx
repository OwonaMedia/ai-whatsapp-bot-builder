'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';

interface SupportIndicatorProps {
  authenticated?: boolean;
}

export default function SupportIndicator({ authenticated = false }: SupportIndicatorProps) {
  const locale = useLocale();
  const t = useTranslations('support.inbox');
  const supabase = useMemo(() => {
    if (!authenticated) {
      return null;
    }

    try {
      return createClient();
    } catch (error) {
      console.warn('[SupportIndicator] Supabase Client unavailable:', error);
      return null;
    }
  }, [authenticated]);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [loading, setLoading] = useState(authenticated);

  useEffect(() => {
    if (!authenticated || !supabase) {
      setHasUpdates(false);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadUnreadStatus = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        if (isMounted) {
          setHasUpdates(false);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .select('status')
        .eq('user_id', userId)
        .in('status', ['investigating', 'resolved'])
        .limit(1);

      if (!isMounted) return;

      if (error) {
        console.error('[SupportIndicator] Failed to load updates', error);
        setHasUpdates(false);
      } else {
        setHasUpdates((data ?? []).length > 0);
      }
      setLoading(false);
    };

    loadUnreadStatus();

    // REALTIME DEAKTIVIERT - Kostenreduzierung
    // Statt Realtime-Subscription verwenden wir Polling alle 30 Sekunden
    const pollingInterval = setInterval(() => {
      if (isMounted) {
        loadUnreadStatus();
      }
    }, 30000); // Alle 30 Sekunden prüfen

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, supabase]);

  if (!authenticated || !supabase) {
    return (
      <Link href={`/${locale}/support/messages`} className="text-sm text-gray-600 hover:text-brand-green transition-colors">
        {t('title')}
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/support/messages`}
      className={clsx(
        'relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        hasUpdates ? 'bg-brand-green/10 text-brand-green' : 'bg-gray-100 text-gray-700 hover:text-brand-green hover:bg-brand-green/10'
      )}
      aria-live="polite"
    >
      <span>🛟 {t('title')}</span>
      {loading ? (
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
      ) : hasUpdates ? (
        <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow shadow-red-300" />
      ) : null}
    </Link>
  );
}


