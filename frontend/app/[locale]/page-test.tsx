import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function HomePageTest({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  try {
    const { locale } = await params;
    
    // Minimale Test-Version
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold text-white mb-4">WhatsApp Bot Builder</h1>
          <p className="text-slate-300 mb-8">DSGVO-konforme WhatsApp Business Bot Builder</p>
          <p className="text-sm text-slate-400 mb-4">✅ Seite wird geladen!</p>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-flex items-center justify-center rounded-xl bg-brand-green px-6 py-3 text-base font-semibold text-white"
          >
            Jetzt starten
          </Link>
        </div>
      </main>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Fehler</h1>
          <p className="text-slate-300 mb-8">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </main>
    );
  }
}




