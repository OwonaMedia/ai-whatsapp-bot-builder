import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Supported locales
export const locales = ['de', 'en', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'de';

export default getRequestConfig(async ({ requestLocale }) => {
  // ✅ FIX: Next.js 15 + next-intl 3.22+: requestLocale statt locale
  const locale = await requestLocale;

  // ✅ FIX: Wenn locale undefined ist, verwende defaultLocale (nicht notFound!)
  // Das kann passieren bei Static Assets, Favicon, etc.
  const validLocale: Locale = (locale && locales.includes(locale as Locale))
    ? (locale as Locale)
    : defaultLocale;

  try {
    // ✅ FIX: Dynamischer Import mit Error-Handling
    const messagesModule = await import(`./messages/${validLocale}.json`);
    const messages = messagesModule.default;

    if (!messages || typeof messages !== 'object') {
      console.error('[i18n] Invalid messages for locale:', validLocale);
      // Fallback: versuche defaultLocale
      if (validLocale !== defaultLocale) {
        const defaultMessages = (await import(`./messages/${defaultLocale}.json`)).default;
        return {
          locale: defaultLocale,
          messages: defaultMessages,
        };
      }
      notFound();
    }

    return {
      locale: validLocale,
      messages,
    };
  } catch (error) {
    console.error('[i18n] Error loading messages for locale:', validLocale, error);
    // Fallback: versuche defaultLocale
    if (validLocale !== defaultLocale) {
      try {
        const defaultMessages = (await import(`./messages/${defaultLocale}.json`)).default;
        return {
          locale: defaultLocale,
          messages: defaultMessages,
        };
      } catch (fallbackError) {
        console.error('[i18n] Fallback to default locale also failed:', fallbackError);
      }
    }
    notFound();
  }
});

