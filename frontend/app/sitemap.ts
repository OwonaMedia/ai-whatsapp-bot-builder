import { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { locales, defaultLocale } from '@/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = config.app.url || 'https://whatsapp.owona.de';
  const currentDate = new Date();
  
  // Statische Seiten für jede Locale
  const staticPages = [
    '', // Homepage
    '/pricing',
    '/contact',
    '/docs',
    '/templates',
    '/resources',
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
    '/legal/data-processing',
  ];
  
  // Demo-Seiten
  const demoPages = [
    '/demo/dashboard',
    '/demo/bot-builder',
    '/demo/features',
    '/demo/analytics',
    '/demo/knowledge',
    '/demo/settings',
  ];
  
  // Alle Seiten kombinieren
  const allPages = [...staticPages, ...demoPages];
  
  // Sitemap-Einträge generieren für alle Locales
  const sitemapEntries: MetadataRoute.Sitemap = [];
  
  locales.forEach((locale) => {
    allPages.forEach((page) => {
      const localePrefix = locale === defaultLocale ? '' : `/${locale}`;
      const path = page === '' ? localePrefix || '/' : `${localePrefix}${page}`;
      
      sitemapEntries.push({
        url: `${baseUrl}${path}`,
        lastModified: currentDate,
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/pricing' ? 0.9 : 0.7,
      });
    });
  });
  
  return sitemapEntries;
}

