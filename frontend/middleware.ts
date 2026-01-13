import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Language detection priority (proprietär):
// 1. Sprachauswahl auf der Seite (Cookie/URL) - Priorität 1
// 2. Browser-Sprache (Accept-Language Header) - Priorität 2
// 3. IP-basierte Geolocation - Priorität 3
// 4. Default (de)

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ WICHTIG: Statische Dateien (Videos, Bilder, etc.) NICHT durch Middleware leiten
  // Diese sollten direkt über Next.js public Verzeichnis erreichbar sein
  if (
    pathname.startsWith('/videos/') ||
    pathname.startsWith('/screenshots/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/.well-known/') ||
    pathname === '/widget.js' || // ✅ Widget-Script direkt durchlassen
    pathname.match(/\.(mp4|webm|jpg|jpeg|png|gif|svg|ico|pdf|woff|woff2|ttf|eot|js|css)$/i) // ✅ JS und CSS hinzugefügt
  ) {
    // Statische Dateien direkt durchlassen, keine Locale-Umleitung
    return NextResponse.next();
  }

  // ✅ RECONSTRUCTED: Multi-language support based on Doc
  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    // Basic locale detection (simplified for robustness)
    const locale = defaultLocale;

    // Redirect to default locale
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        request.url
      )
    );
  }

  return NextResponse.next();
}

// Legacy function - jetzt durch detectLocale() ersetzt
// Behalten für Kompatibilität, aber nicht mehr verwendet
function getLocaleFromRequest(request: NextRequest): string {
  return defaultLocale;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known (Apple Pay / andere Verifikationen)
     * - screenshots, docs, images, videos (static directories)
     * - files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|\.well-known|widget\.js|screenshots|docs|images|videos|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css)$).*)',
  ],
};
