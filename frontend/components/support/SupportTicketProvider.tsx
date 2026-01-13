'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SupportTicketSheet from './SupportTicketSheet';
import { SupportTicketContext, SupportTicketMetadata } from './SupportTicketContext';
import { createClient } from '@/lib/supabase';

interface SupportTicketProviderProps {
  children: ReactNode;
}

export default function SupportTicketProvider({ children }: SupportTicketProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [metadata, setMetadata] = useState<SupportTicketMetadata | undefined>(undefined);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ensureAuthenticated = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.warn('[SupportTicketProvider] Failed to fetch user session', error);
      }

      if (!user) {
        const currentPath = `${pathname ?? ''}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
        const redirectTarget = currentPath && currentPath.startsWith(`/${locale}`)
          ? currentPath
          : `/${locale}`;

        router.push(`/${locale}/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
        return false;
      }

      return true;
    } catch (authError) {
      console.warn('[SupportTicketProvider] Authentication check failed', authError);
      router.push(`/${locale}/auth/login`);
      return false;
    }
  }, [locale, pathname, router, searchParams]);

  const openTicket = useCallback(
    async (meta?: SupportTicketMetadata) => {
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) {
        return;
      }

      setMetadata(meta);
      setIsOpen(true);
    },
    [ensureAuthenticated]
  );

  const closeTicket = useCallback(() => {
    setIsOpen(false);
    setMetadata(undefined);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      metadata,
      openTicket,
      closeTicket,
    }),
    [isOpen, metadata, openTicket, closeTicket]
  );

  return (
    <SupportTicketContext.Provider value={value}>
      {children as ReactNode}
      <SupportTicketSheet />
    </SupportTicketContext.Provider>
  );
}


