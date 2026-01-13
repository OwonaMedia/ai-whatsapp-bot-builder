import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MinimalDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('home');

  const benefits = [
    {
      title: t('features.dsgvo.title'),
      description: t('features.dsgvo.description'),
      points: (t.raw('features.dsgvo.benefits') as string[]) || [],
    },
    {
      title: t('features.ai.title'),
      description: t('features.ai.description'),
      points: (t.raw('features.ai.benefits') as string[]) || [],
    },
    {
      title: t('features.nocode.title'),
      description: t('features.nocode.description'),
      points: (t.raw('features.nocode.benefits') as string[]) || [],
    },
  ];

  const trustBadges =
    (t.raw('hero.trustBadges') as string[]) || ['DSGVO-konform', 'EU-Datenhaltung', '99% Uptime'];

  return (
    <div className="relative overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 -top-24 flex justify-center blur-3xl">
        <div className="h-56 w-[36rem] rounded-full bg-brand-green/15" />
      </div>
      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-6 py-20 text-center lg:py-28">
        <span className="inline-flex items-center justify-center rounded-full bg-brand-green/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green">
          {t('hero.subheadline')}
        </span>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
          {t('hero.headline')}
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
          {t('valueProposition')}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-green px-8 py-3 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-brand-dark sm:w-auto"
          >
            {t('hero.ctaPrimary')}
          </Link>
          <Link
            href={`/${locale}/demo/dashboard`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-brand-green px-8 py-3 text-base font-semibold text-brand-green transition hover:bg-brand-green/5 sm:w-auto"
          >
            {t('hero.ctaSecondary')}
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
          {trustBadges.map((badge) => (
            <div key={badge} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              <span>{badge}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-16 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <article
            key={benefit.title}
            className="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <h2 className="text-xl font-semibold text-slate-900">{benefit.title}</h2>
            <p className="mt-3 text-sm text-slate-600">{benefit.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              {benefit.points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-green" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:grid-cols-[minmax(0,0.6fr),minmax(0,0.4fr)]">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-green">
              Guided workflows
            </h3>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {t('trust.caseStudies.title')}
            </p>
            <p className="mt-3 text-sm text-slate-600">{t('trust.caseStudies.subtitle')}</p>
            <div className="mt-6 grid gap-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{t('trust.caseStudies.items.healthcare.headline')}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {t('trust.caseStudies.items.healthcare.description')}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{t('trust.caseStudies.items.retail.headline')}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {t('trust.caseStudies.items.retail.description')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase text-slate-500">
                {t('trust.security.assuranceTitle')}
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {((t.raw('trust.security.features') as string[]) || []).slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brand-green" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase text-slate-500">Live KPIs</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {t('trust.caseStudies.items.retail.metrics.0', { defaultValue: 'Conversion' })}
                  </p>
                  <p className="text-xl font-semibold text-slate-900">+23%</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {t('trust.caseStudies.items.healthcare.metrics.0', { defaultValue: 'Response' })}
                  </p>
                  <p className="text-xl font-semibold text-slate-900">38%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


