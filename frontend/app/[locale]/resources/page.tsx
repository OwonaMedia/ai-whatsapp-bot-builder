import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, defaultLocale, Locale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ListBullet = ({ className }: { className?: string }) => (
  <span
    className={`mt-1 inline-flex h-2 w-2 rounded-full bg-brand-green flex-shrink-0 ${className ?? ''}`}
  />
);

const Pill = ({ label }: { label: string }) => (
  <span className="inline-flex items-center rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
    {label}
  </span>
);

type CaseStudy = {
  id: string;
  industry: string;
  title: string;
  description: string;
  metrics: string[];
  result: string;
  ctaLabel: string;
  ctaHref: string;
};

type ResourceItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  metric?: string;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const resolveHref = (locale: string, href: string) => {
  if (!href) return '#';
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    return href;
  }
  const sanitized = href.replace(/^\/+/, '');
  return `/${locale}/${sanitized}`;
};

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Ressourcen</h1>
          <p className="mt-4 text-gray-600">
            Während des Builds werden keine Supabase- oder Remote-Abfragen ausgeführt. Die vollständige
            Ressourcenseite wird im laufenden Betrieb bereitgestellt.
          </p>
        </div>
      </main>
    );
  }
  const normalizedLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const t = await getTranslations('resourcesPage');

  const heroStats = (t.raw('hero.stats') as Array<{ label: string; value: string }>) ?? [];
  const partnerLogos = (t.raw('partners.logos') as string[]) ?? [];
  const caseStudiesRecord = (t.raw('caseStudies.items') as Record<string, CaseStudy>) ?? {};
  const caseStudies: CaseStudy[] = Object.values(caseStudiesRecord);
  const resources = (t.raw('resources.items') as ResourceItem[]) ?? [];
  const resourceCategories = (t.raw('resources.categories') as string[]) ?? [];
  const testimonials = (t.raw('testimonials.items') as Testimonial[]) ?? [];
  const assurance = (t.raw('resources.assurance') as string[]) ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20">
      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
        {/* Hero */}
        <section className="max-w-5xl mx-auto text-center mb-16">
          <Pill label={t('hero.pill')} />
          <h1 className="mt-4 text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-600 leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={resolveHref(normalizedLocale, t('hero.ctaPrimaryHref'))}
              className="inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {t('hero.ctaPrimary')}
            </Link>
            <Link
              href={resolveHref(normalizedLocale, t('hero.ctaSecondaryHref'))}
              className="inline-flex items-center justify-center rounded-lg border border-brand-green px-6 py-3 text-sm font-semibold text-brand-green transition hover:bg-brand-light/20"
            >
              {t('hero.ctaSecondary')}
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white/70 p-6 shadow-sm border border-gray-100"
              >
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="mt-2 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Partner Logos */}
        <section className="max-w-5xl mx-auto mb-16">
          <div className="rounded-3xl bg-white shadow-lg border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">
                  {t('partners.title')}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">
                  {t('partners.subtitle')}
                </h2>
              </div>
              <p className="text-sm text-gray-500 max-w-md">
                {t('partners.description')}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              {partnerLogos.map((logo) => (
                <div
                  key={logo}
                  className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-semibold text-gray-600"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="max-w-6xl mx-auto mb-16">
          <div className="mb-8 text-center">
            <Pill label={t('caseStudies.pill')} />
            <h2 className="mt-4 text-3xl font-bold text-gray-900">{t('caseStudies.title')}</h2>
            <p className="mt-2 text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              {t('caseStudies.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {caseStudies.map((study) => (
              <div
                key={study.id}
                className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-green mb-2">
                  {study.industry}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{study.title}</h3>
                <p className="text-sm text-gray-600 flex-1">{study.description}</p>
                <div className="mt-4 space-y-2">
                  {study.metrics.map((metric) => (
                    <div key={metric} className="flex items-start gap-2 text-sm text-gray-700">
                      <ListBullet />
                      <span>{metric}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-gray-500">{study.result}</p>
                <Link
                  href={resolveHref(normalizedLocale, study.ctaHref)}
                  className="mt-5 inline-flex items-center text-sm font-semibold text-brand-green hover:text-brand-dark"
                >
                  {study.ctaLabel}
                  <span className="ml-2">→</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Resource Library */}
        <section className="max-w-6xl mx-auto mb-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <Pill label={t('resources.pill')} />
              <h2 className="mt-4 text-3xl font-bold text-gray-900">{t('resources.title')}</h2>
              <p className="mt-2 text-base text-gray-600">{t('resources.subtitle')}</p>
            </div>
            {resourceCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {resourceCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((item) => (
              <div
                key={item.id}
                className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-3">
                  <Pill label={item.category} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 flex-1">{item.description}</p>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  {item.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-2">
                      <ListBullet />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={resolveHref(normalizedLocale, item.ctaHref)}
                  className="mt-5 inline-flex items-center text-sm font-semibold text-brand-green hover:text-brand-dark"
                >
                  {item.ctaLabel}
                  <span className="ml-2">→</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-6xl mx-auto mb-16">
          <div className="mb-8 text-center">
            <Pill label={t('testimonials.pill')} />
            <h2 className="mt-4 text-3xl font-bold text-gray-900">{t('testimonials.title')}</h2>
            <p className="mt-2 text-base text-gray-600 max-w-3xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <blockquote
                key={testimonial.name}
                className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <p className="text-sm text-gray-700 leading-relaxed">{testimonial.quote}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-xs text-gray-500">{testimonial.role}</p>
                  {testimonial.metric && (
                    <p className="mt-2 text-sm font-medium text-brand-green">{testimonial.metric}</p>
                  )}
                </div>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Assurance */}
        <section className="max-w-5xl mx-auto mb-16">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <Pill label={t('resources.assuranceTitle')} />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">{t('resources.assuranceHeadline')}</h2>
                <p className="mt-2 text-sm text-gray-600 max-w-xl">
                  {t('resources.assuranceSubtitle')}
                </p>
              </div>
              <Link
                href={resolveHref(normalizedLocale, t('resources.assuranceCtaHref'))}
                className="inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                {t('resources.assuranceCtaLabel')}
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              {assurance.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <ListBullet />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto text-center">
          <div className="rounded-3xl bg-brand-green text-white px-6 py-12 md:px-12 md:py-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-sm md:text-base text-brand-light/90 max-w-3xl mx-auto mb-6">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href={resolveHref(normalizedLocale, t('cta.primaryHref'))}
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-green transition hover:bg-brand-light"
              >
                {t('cta.primary')}
              </Link>
              <Link
                href={resolveHref(normalizedLocale, t('cta.secondaryHref'))}
                className="inline-flex items-center justify-center rounded-lg border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t('cta.secondary')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


