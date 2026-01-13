import { locales } from '@/i18n';

/**
 * Generate static params for verify-otp route
 * Ensures the route is properly recognized during build
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

