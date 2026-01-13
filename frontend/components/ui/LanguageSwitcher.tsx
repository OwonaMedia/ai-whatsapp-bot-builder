'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '@/i18n';
import { clsx } from 'clsx';

const languages = [
  // European
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  // African
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
] as const;

interface LanguageSwitcherProps {
  align?: 'left' | 'right';
}

export default function LanguageSwitcher({ align = 'right' }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Update URL - handle locale prefix
    const segments = pathname.split('/').filter(Boolean);

    // Check if first segment is a locale
    const firstSegment = segments[0];
    const isLocaleInPath = locales.includes(firstSegment as any);

    let newPath: string;
    if (isLocaleInPath) {
      // Replace locale in path
      segments[0] = newLocale;
      newPath = '/' + segments.join('/');
    } else {
      // Add locale to path (default locale might not have prefix)
      if (newLocale === 'de') {
        // Default locale - remove prefix
        newPath = pathname.startsWith('/') ? pathname : '/' + pathname;
      } else {
        // Non-default locale - add prefix
        newPath = `/${newLocale}${pathname}`;
      }
    }

    router.push(newPath);
    router.refresh();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="text-sm font-medium hidden sm:inline">
          {currentLanguage.name}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={clsx(
            "absolute mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto",
            align === 'right' ? 'right-0' : 'left-0'
          )}>
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
              European
            </div>
            {languages.slice(0, 3).map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${locale === lang.code ? 'bg-brand-light/10' : ''
                  }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium flex-1">{lang.name}</span>
                {locale === lang.code && (
                  <span className="text-brand-green">✓</span>
                )}
              </button>
            ))}
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-b border-gray-100">
              African
            </div>
            {languages.slice(3).map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors last:rounded-b-lg ${locale === lang.code ? 'bg-brand-light/10' : ''
                  }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium flex-1">{lang.name}</span>
                {locale === lang.code && (
                  <span className="text-brand-green">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

