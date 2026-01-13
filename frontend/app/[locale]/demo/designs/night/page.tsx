import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NightDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('home');

  const timeline = [
    {
      title: t('trust.testimonials.items.agency.metric'),
      description: t('trust.testimonials.items.agency.quote'),
    },
    {
      title: t('trust.testimonials.items.retail.metric'),
      description: t('trust.testimonials.items.retail.quote'),
    },
    {
      title: t('trust.testimonials.items.saas.metric'),
      description: t('trust.testimonials.items.saas.quote'),
    },
  ];

  return (
    <div className="relative isolate overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.35),_transparent_55%)]" />
      <section className="mx-auto flex w-full max-w-6xl flex-col-reverse gap-10 px-6 pb-20 pt-24 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            {t('hero.trustBadges.0')}
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            {t('hero.headline')}
          </h1>
          <p className="max-w-xl text-base text-slate-300 sm:text-lg">
            {t('hero.subheadline')}
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/auth/signup`}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              {t('hero.ctaPrimary')}
            </Link>
            <Link
              href={`/${locale}/demo/features`}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300/40 px-6 py-3 text-base font-semibold text-emerald-200 transition hover:border-emerald-200 hover:text-white"
            >
              {t('hero.ctaSecondary')}
            </Link>
          </div>
          <div className="mt-8 space-y-3 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-xl shadow-black/40 backdrop-blur">
            <p className="text-sm font-semibold text-emerald-200">
              {t('trust.security.title')}
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              {((t.raw('trust.security.features') as string[]) || []).slice(0, 3).map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_40px_120px_-45px_rgba(16,185,129,0.45)] backdrop-blur">
            <div className="absolute inset-0 -z-10 bg-[conic-gradient(from_160deg_at_50%_50%,rgba(16,185,129,0.35),rgba(59,130,246,0.15),rgba(16,185,129,0.35))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
              Experience Preview
            </h2>
            <p className="mt-4 text-lg font-semibold text-white">
              {t('features.ai.title')}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {t('features.ai.description')}
            </p>
            <div className="mt-6 grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
              {(t.raw('features.ai.benefits') as string[] || []).map((benefit) => (
                <div key={benefit} className="rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-4">
                  <p>{benefit}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-black/40 p-4 text-xs text-slate-300">
              <div className="flex items-center justify-between text-emerald-200">
                <span>Realtime Bot Monitor</span>
                <span>Live</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-semibold text-white">+284%</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Response Speed</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">5.2s</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Avg. Resolution</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[minmax(0,0.65fr),minmax(0,0.35fr)]">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
              Narrative Journey
            </h3>
            <p className="mt-4 text-3xl font-semibold text-white">
              {t('trust.testimonials.title')}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              {t('trust.testimonials.subtitle')}
            </p>
            <div className="mt-8 space-y-6 border-l border-emerald-300/30 pl-6">
              {timeline.map((item) => (
                <div key={item.title} className="relative">
                  <span className="absolute -left-[29px] mt-1 h-3 w-3 rounded-full border border-emerald-300 bg-slate-950" />
                  <p className="text-sm font-semibold text-emerald-200">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl shadow-emerald-500/10">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                {t('trust.security.assuranceTitle')}
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {((t.raw('trust.security.assurance') as string[]) || []).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                CTA
              </p>
              <h4 className="mt-3 text-xl font-semibold text-white">
                {t('trust.security.subtitle')}
              </h4>
              <div className="mt-6 space-y-3">
                <Link
                  href={`/${locale}/contact`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300"
                >
                  {t('trust.security.ctaPrimary')}
                </Link>
                <Link
                  href={`/${locale}/docs`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-400/40 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:text-white"
                >
                  {t('trust.security.ctaSecondary')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


