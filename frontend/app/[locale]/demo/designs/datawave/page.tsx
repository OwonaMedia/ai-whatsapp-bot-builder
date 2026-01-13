import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DatawaveDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('home');

  const stats = [
    { label: 'Avg. Bot NPS', value: '74', suffix: '/100' },
    { label: 'Automated Intents', value: '62', suffix: '+' },
    { label: 'Response SLA', value: '4.6', suffix: 's' },
  ];

  const modules = [
    {
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
      items: (t.raw('features.analytics.benefits') as string[]) || [],
    },
    {
      title: t('features.integrations.title'),
      description: t('features.integrations.description'),
      items: (t.raw('features.integrations.benefits') as string[]) || [],
    },
    {
      title: t('features.dsgvo.title'),
      description: t('features.dsgvo.description'),
      items: (t.raw('features.dsgvo.benefits') as string[]) || [],
    },
  ];

  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 -top-48 -z-10 flex justify-center">
        <div className="h-[28rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.12),_transparent_65%)] blur-3xl" />
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-20 pt-24 lg:grid-cols-[minmax(0,0.6fr),minmax(0,0.4fr)] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {t('trust.caseStudies.pill', { defaultValue: 'Impact Stories' })}
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Datawave Experience Hub
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            {t('hero.subheadline')}
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/auth/signup`}
              className="inline-flex items-center justify-center rounded-xl bg-brand-green px-6 py-3 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              {t('hero.ctaPrimary')}
            </Link>
            <Link
              href={`/${locale}/demo/analytics`}
              className="inline-flex items-center justify-center rounded-xl border border-brand-green px-6 py-3 text-base font-semibold text-brand-green transition hover:bg-brand-green/5"
            >
              {t('hero.ctaSecondary')}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {stat.value}
                  <span className="text-base font-medium text-slate-400"> {stat.suffix}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-brand-green/10 backdrop-blur">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_60%)]" />
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Realtime Cohorts</span>
            <span>Live feed</span>
          </div>
          <div className="mt-6 space-y-5 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Health</span>
                <span>+38%</span>
              </div>
              <p className="mt-2 text-slate-700">
                {t('trust.caseStudies.items.healthcare.description')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Retail</span>
                <span>+23%</span>
              </div>
              <p className="mt-2 text-slate-700">
                {t('trust.caseStudies.items.retail.description')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Agency</span>
                <span>72h</span>
              </div>
              <p className="mt-2 text-slate-700">
                {t('trust.caseStudies.items.agency.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[minmax(0,0.35fr),minmax(0,0.65fr)]">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-green">
              Modular Sections
            </h2>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {t('features.sectionLabel', { defaultValue: 'Produktvorteile' } as any) ||
                'Produktvorteile'}
            </p>
            <p className="mt-3 text-sm text-slate-600">{t('hero.subheadline')}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module.title}
                className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-xl"
              >
                <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{module.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {module.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand-green" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-900 text-slate-100">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,0.55fr),minmax(0,0.45fr)] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              {t('trust.security.title')}
            </p>
            <h3 className="mt-4 text-3xl font-semibold text-white">
              {t('trust.security.subtitle')}
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {(t.raw('trust.security.features') as string[] || []).map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-[0_40px_120px_-45px_rgba(16,185,129,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
              Governance & Actions
            </p>
            <p className="mt-3 text-sm text-slate-200">
              {t('trust.security.subtitle')}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center rounded-xl bg-brand-green px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-brand-light"
              >
                {t('trust.security.ctaPrimary')}
              </Link>
              <Link
                href={`/${locale}/docs`}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300/40 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-100"
              >
                {t('trust.security.ctaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


