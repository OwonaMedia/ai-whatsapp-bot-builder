'use client';

import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

interface NavLink {
  id: string;
  href: string;
  label: string;
  onlyForMonitoring?: boolean;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { addToast } = useToast();
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const monitoringAllowlist = useMemo(() => {
    const list = process.env.NEXT_PUBLIC_MONITORING_ALLOWLIST;
    return list ? list.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean) : [];
  }, []);

  const isMonitoringUser = useMemo(() => {
    if (!user?.email) {
      return false;
    }
    const email = user.email.toLowerCase();
    if (monitoringAllowlist.includes(email)) {
      return true;
    }
    return email.endsWith('@owona.de');
  }, [user?.email, monitoringAllowlist]);

  useEffect(() => {
    try {
      const supabase = createClient();

      supabase.auth
        .getUser()
        .then(({ data: { user } }: { data: { user: any } }) => {
          setUser(user);
          setIsLoading(false);
        })
        .catch((error: unknown) => {
          console.warn('[Header] Error getting user:', error);
          setIsLoading(false);
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        setUser(session?.user ?? null);
      });

      return () => subscription?.unsubscribe();
    } catch (error) {
      console.warn('[Header] Supabase client creation failed, continuing without auth:', error);
      setIsLoading(false);
      return undefined; // Explicit return for all code paths
    }
  }, []);

  useEffect(() => {
    // Hydration-Sicherheit: Nur auf Client ausführen
    if (typeof window === 'undefined' || !document.body) {
      return;
    }

    if (!isMenuOpen) {
      document.body.style.overflowX = 'hidden';
      document.body.style.overflowY = 'auto';
      return;
    }
    const previousOverflowX = document.body.style.overflowX;
    const previousOverflowY = document.body.style.overflowY;
    document.body.style.overflow = 'hidden';
    return () => {
      if (typeof window !== 'undefined' && document.body) {
        document.body.style.overflowX = previousOverflowX;
        document.body.style.overflowY = previousOverflowY;
      }
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: t('auth.logout') + ' fehlgeschlagen.',
        });
        return;
      }

      addToast({
        type: 'success',
        title: t('auth.logout'),
        message: 'Sie wurden erfolgreich abgemeldet.',
      });
    } catch (error) {
      console.warn('[Header] Logout failed, redirecting anyway:', error);
    }

    router.push(`/${locale}`);
    router.refresh();
  }, [addToast, locale, router, t, tCommon]);

  const navLinks: NavLink[] = useMemo(
    () => [
      { id: 'dashboard', href: `/${locale}/dashboard`, label: tNav('dashboard') },
      { id: 'bots', href: `/${locale}/bots`, label: tNav('bots') },
      { id: 'templates', href: `/${locale}/templates`, label: tNav('templates') },
      { id: 'monitoring', href: `/${locale}/dashboard/monitoring`, label: tNav('monitoring'), onlyForMonitoring: true },
      { id: 'settings', href: `/${locale}/settings`, label: tNav('settings') },
      { id: 'pricing', href: `/${locale}/pricing`, label: t('pricing.title', { defaultValue: 'Pricing' }) },
    ],
    [locale, t, tNav]
  );

  const guestLinks: NavLink[] = useMemo(
    () => [
      { id: 'pricing', href: `/${locale}/pricing`, label: t('pricing.title', { defaultValue: 'Pricing' }) },
      { id: 'templates', href: `/${locale}/templates`, label: tNav('templates') },
    ],
    [locale, t, tNav]
  );

  const renderLinks = (variant: 'desktop' | 'mobile') => {
    const list = user ? navLinks.filter((item) => (item.onlyForMonitoring ? isMonitoringUser : true)) : guestLinks;

    return list.map((link) => (
      <Link
        key={link.id}
        href={link.href}
        className={clsx('transition-colors', {
          'text-slate-300 hover:text-emerald-300': variant === 'desktop',
          'text-base text-slate-200 py-2 block hover:text-emerald-300': variant === 'mobile',
          'font-semibold text-emerald-300': pathname?.startsWith(link.href),
        })}
      >
        {link.label}
      </Link>
    ));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 shadow-[0_12px_40px_-28px_rgba(16,185,129,0.55)] backdrop-blur supports-[backdrop-filter]:bg-slate-950/65">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={`/${locale}`} className="flex items-center">
            <span className="text-2xl font-semibold tracking-tight text-emerald-200 transition-colors hover:text-emerald-300">
              {tCommon('appName')}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                {renderLinks('desktop')}
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                  <LanguageSwitcher />
                  {!isLoading && user?.email && (
                    <span className="text-sm text-slate-400">
                      {user.email}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-200 hover:text-emerald-200">
                    {tNav('logout')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {renderLinks('desktop')}
                <LanguageSwitcher />
                <Link href={`/${locale}/auth/login`}>
                  <Button variant="ghost" className="text-slate-200 hover:text-emerald-200">
                    {t('auth.login')}
                  </Button>
                </Link>
                <Link href={`/${locale}/auth/signup`}>
                  <Button variant="primary" className="shadow-[0_10px_30px_-15px_rgba(16,185,129,.8)]">
                    {t('auth.signup')}
                  </Button>
                </Link>
              </>
            )}
          </nav>

          <div className="md:hidden flex items-center">
            <button
              id="menuToggle"
              type="button"
              className="flex flex-col gap-[4px] bg-none border border-white/15 p-3 rounded-lg text-emerald-500 cursor-pointer transition-colors hover:bg-white/5 focus:outline-none"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? t('navigation.closeMenu', { defaultValue: 'Menü schließen' }) : t('navigation.openMenu', { defaultValue: 'Menü öffnen' })}
              aria-expanded={isMenuOpen}
            >
              <span
                className={clsx('block w-7 h-0.5 bg-emerald-500 transition-all duration-300', {
                  'translate-y-[6px] rotate-45': isMenuOpen,
                  'translate-y-0 rotate-0': !isMenuOpen,
                })}
              />
              <span
                className={clsx('block w-7 h-0.5 bg-emerald-500 transition-all duration-300', {
                  'opacity-0': isMenuOpen,
                  'opacity-100': !isMenuOpen,
                })}
              />
              <span
                className={clsx('block w-7 h-0.5 bg-emerald-500 transition-all duration-300', {
                  '-translate-y-[6px] -rotate-45': isMenuOpen,
                  'translate-y-0 rotate-0': !isMenuOpen,
                })}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Overlay */}
      <div
        id="menuOverlay"
        className={clsx(
          'fixed inset-0 z-[60] transition-all duration-300 ease-in-out md:hidden',
          isMenuOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
        )}
      >
        <div
          id="menuBackdrop"
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={clsx(
            'absolute right-0 top-0 h-screen max-w-md w-full flex flex-col border-l border-white/10 bg-slate-950/95 transition-transform duration-300 ease-in-out backdrop-blur-xl',
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <span className="text-xl font-bold text-slate-100">{tNav('menu', { defaultValue: 'Menü' })}</span>
            <button
              id="menuClose"
              className="bg-none border border-white/15 p-2 rounded-lg text-emerald-500 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-col">
              {user ? (
                <>
                  {renderLinks('mobile')}
                </>
              ) : (
                <>
                  <Link
                    href={`/${locale}/templates`}
                    className="text-lg text-slate-100 py-4 border-b border-white/5 hover:text-emerald-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tNav('templates')}
                  </Link>
                  <Link
                    href={`/${locale}/pricing`}
                    className="text-lg text-slate-100 py-4 border-b border-white/5 hover:text-emerald-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('pricing.title', { defaultValue: 'Pricing' })}
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 pt-8 border-top border-white/10">
              <div className="mb-6">
                <span className="text-lg font-medium text-slate-400 block mb-2">
                  {t('navigation.language', { defaultValue: 'Sprache' })}
                </span>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher align="left" />
                </div>
              </div>

              {user ? (
                <div className="space-y-4">
                  {!isLoading && user?.email && (
                    <div className="text-sm text-slate-400 break-all mb-4 px-1">
                      {user.email}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full text-slate-200"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    {tNav('logout')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 mt-6">
                  <Link href={`/${locale}/auth/login`} onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" size="lg" className="w-full text-slate-100 border border-white/10 rounded-xl">
                      {t('auth.login')}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/auth/signup`} onClick={() => setIsMenuOpen(false)}>
                    <Button variant="primary" size="lg" className="w-full bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20">
                      {t('auth.signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

