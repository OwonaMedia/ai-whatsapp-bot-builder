import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {t('hero.trustBadges.0')}
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                {t('hero.headline')}
              </h1>

              <p className="text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('hero.subheadline')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href={`/${locale}/auth/signup`}>
                  <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 h-14 text-lg shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)]">
                    {t('hero.ctaPrimary')}
                  </Button>
                </Link>
                <Link href={`/${locale}/templates`}>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 h-14 text-lg border-white/10 hover:bg-white/5">
                    {t('hero.ctaSecondary')}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-4">
                {['EU-Datenhaltung', '99% Uptime', 'Kein Code'].map((badge) => (
                  <div key={badge} className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {badge}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:block">
              <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-2 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent pointer-events-none" />
                <Image
                  src="/images/hero.png"
                  alt="WhatsApp Bot Builder Interface"
                  width={800}
                  height={600}
                  className="rounded-xl transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-900/50 relative border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Alles was Sie für professionelle Bots brauchen
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Vom visuellen Flow-Anbieter bis hin zu tiefen KI-Integrationen und Compliance-Tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { id: 'dsgvo', icon: '🛡️' },
              { id: 'ai', icon: '🧠' },
              { id: 'nocode', icon: '🎨' },
              { id: 'analytics', icon: '📈' },
              { id: 'integrations', icon: '🔌' },
              { id: 'templates', icon: '📚', title: 'Vorlagen-Bibliothek', description: 'Starten Sie mit 7+ fertigen Industrie-Templates.' }
            ].map((f) => {
              const featureData = t.raw(`features.${f.id}`) || {};
              return (
                <div key={f.id} className="p-8 rounded-2xl border border-white/5 bg-slate-950/50 hover:border-emerald-500/30 transition-all duration-300 group">
                  <div className="text-4xl mb-6 transform transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300 inline-block">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {f.title || featureData.title}
                  </h3>
                  <p className="text-slate-400 mb-6 leading-relaxed">
                    {f.description || featureData.description}
                  </p>
                  <ul className="space-y-3">
                    {(featureData.benefits || []).slice(0, 3).map((benefit: string) => (
                      <li key={benefit} className="flex items-center gap-3 text-sm text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof / Trust Section */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold text-white">
              Vertraut von führenden Unternehmen
            </h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-2xl font-bold text-slate-300">Klinikverbund Nord</span>
            <span className="text-2xl font-bold text-slate-300">UrbanFit Retail</span>
            <span className="text-2xl font-bold text-slate-300">Converso Digital</span>
            <span className="text-2xl font-bold text-slate-300">Finovate SaaS</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 p-8 md:p-16 text-center space-y-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-bold text-white max-w-2xl mx-auto">
              Bereit für Ihren ersten WhatsApp Bot?
            </h2>
            <p className="text-xl text-slate-400 max-w-xl mx-auto">
              Starten Sie heute kostenlos und erleben Sie, wie Automatisierung Ihr Business verändert.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`/${locale}/auth/signup`}>
                <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 h-14 text-lg">
                  {t('hero.ctaPrimary')}
                </Button>
              </Link>
              <Link href={`/${locale}/contact`}>
                <Button variant="ghost" size="lg" className="w-full sm:w-auto px-8 h-14 text-lg text-white">
                  Strategiegespräch buchen
                </Button>
              </Link>
            </div>
            <p className="text-slate-500 text-sm">
              Keine Kreditkarte erforderlich. 14 Tage voller Zugriff.
            </p>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-bold text-emerald-400">
            {tCommon('appName')}
          </div>
          <nav className="flex flex-wrap gap-8 text-sm text-slate-500">
            <Link href={`/${locale}/pricing`} className="hover:text-emerald-400 transition-colors">Preise</Link>
            <Link href={`/${locale}/templates`} className="hover:text-emerald-400 transition-colors">Vorlagen</Link>
            <Link href={`/${locale}/docs`} className="hover:text-emerald-400 transition-colors">Dokumentation</Link>
            <Link href={`/${locale}/support/messages`} className="hover:text-emerald-400 transition-colors font-semibold text-slate-300">Support</Link>
            <Link href={`/${locale}/legal/privacy`} className="hover:text-emerald-400 transition-colors">Datenschutz</Link>
            <Link href={`/${locale}/legal/imprint`} className="hover:text-emerald-400 transition-colors">Impressum</Link>
          </nav>
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} {tCommon('domain')}
          </div>
        </div>
      </footer>
    </div>
  );
}
