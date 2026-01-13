import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, defaultLocale } from '@/i18n';
import { Inter } from 'next/font/google';
import './globals.css';
import { config } from '@/lib/config';
import { ToastProvider } from '@/components/ui/Toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SupportTicketProvider from '@/components/support/SupportTicketProvider';
import MCPSupportChatbotWrapper from '@/components/support/MCPSupportChatbotWrapper';
// import SimpleChatbotTest from '@/components/support/SimpleChatbotTest'; // Temporär auskommentiert - wird durch MCPSupportChatbotWrapper ersetzt
import AppIntlProvider from '@/components/providers/AppIntlProvider';
import BodyOverflowGuard from '@/components/layout/BodyOverflowGuard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return (
      <div className={`${inter.className} min-h-screen bg-white text-gray-900`}>
        <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
          <h1 className="text-3xl font-semibold">WhatsApp Bot Builder</h1>
          <p className="mt-4 text-gray-600">
            Während des Builds werden localespezifische Ressourcen nicht geladen. Im Live-Betrieb erscheint hier das vollständige Layout.
          </p>
        </main>
      </div>
    );
  }
  
  // ✅ FIX: Only validate locale if it's not a static file request
  // Static files should be handled by middleware and not reach here
  const localeStr = String(locale || '').toLowerCase();
  
  // Skip validation for known static file patterns or invalid locales
  if (
    localeStr.includes('.') || 
    localeStr.includes('favicon') || 
    localeStr.includes('icon') || 
    localeStr.includes('og-image') ||
    !locale || 
    !locales.includes(locale as any)
  ) {
    // Redirect to default locale instead of showing 404
    const { redirect } = await import('next/navigation');
    const defaultLocaleValue = 'de'; // Use literal value instead of imported variable
    redirect(`/${defaultLocaleValue}`);
  }
  
  console.log('[LocaleLayout] Locale validated successfully:', locale);

  // ✅ FIX: Load messages with better error handling
  let messages;
  try {
    messages = await getMessages({ locale });
    
    // ✅ Validate messages object
    if (!messages || typeof messages !== 'object') {
      console.warn('[LocaleLayout] Messages invalid for locale:', locale, 'using default');
      messages = await getMessages({ locale: defaultLocale });
    }
  } catch (error) {
    console.error('[LocaleLayout] Error loading messages for locale:', locale, error);
    // Fallback: try to load default locale messages
    try {
      messages = await getMessages({ locale: defaultLocale });
      console.log('[LocaleLayout] Using default locale messages as fallback');
    } catch (fallbackError) {
      console.error('[LocaleLayout] Fallback message loading failed:', fallbackError);
      // ✅ Last resort: Empty messages object (app will still render)
      messages = {};
    }
  }

  // Base URL for Open Graph images
  const baseUrl = config.app.url || 'https://whatsapp.owona.de';
  const ogImage = `${baseUrl}/og-image.jpg`;
  const siteTitle = 'WhatsApp Bot Builder';
  const siteDescription = 'DSGVO-konforme WhatsApp Business Bot Builder - Erstelle AI-gestützte WhatsApp Bots ohne Code';

  return (
    <html lang={locale} className={inter.className}>
      <head>
        {/* Test-Buttons entfernt - Chatbot ist jetzt aktiv */}
      </head>
      <body
        className="night-theme relative min-h-screen bg-slate-950 text-slate-100"
        style={{ overflowX: 'hidden', overflowY: 'auto' }}
        suppressHydrationWarning={true}
      >
        <AppIntlProvider locale={locale} messages={messages}>
          <ToastProvider>
            <SupportTicketProvider>
              <BodyOverflowGuard />
              <div className="pointer-events-none absolute inset-x-0 top-[-22rem] -z-10 flex justify-center">
                <div className="h-[32rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.4),_transparent_65%)] blur-[110px]" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-[-22rem] -z-10 flex justify-center">
                <div className="h-[32rem] w-[46rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.3),_transparent_62%)] blur-[120px]" />
              </div>
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(8,47,73,0.65),_transparent_55%)]" />

              <Header />
              <main className="relative flex flex-1 flex-col pt-24 md:pt-28">
                <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent" />
                {children}
              </main>
              <Footer />
            </SupportTicketProvider>
            {/* Chatbot außerhalb des SupportTicketProvider für bessere Sichtbarkeit */}
            {/* MCP Support Chatbot - Global auf allen Seiten sichtbar */}
            <MCPSupportChatbotWrapper />
            {/* TEMPORÄR: Minimaler Test-Button zum Debugging (behalten für weitere Tests) */}
            {/* <SimpleChatbotTest /> */}
          </ToastProvider>
        </AppIntlProvider>
        {/* Test-Buttons entfernt - Chatbot ist jetzt aktiv */}
      </body>
    </html>
  );
}

export { };

