import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DesignsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('home');

  const designs = [
    {
      name: 'Datawave',
      slug: 'datawave',
      description: 'Modern data-driven design with emerald accents',
      href: `/${locale}/demo/designs/datawave`,
    },
    {
      name: 'Minimal',
      slug: 'minimal',
      description: 'Clean and minimal design approach',
      href: `/${locale}/demo/designs/minimal`,
    },
    {
      name: 'Night',
      slug: 'night',
      description: 'Dark theme with modern aesthetics',
      href: `/${locale}/demo/designs/night`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12">
        <h1 className="text-4xl font-semibold text-slate-900">Design Varianten</h1>
        <p className="mt-4 text-lg text-slate-600">
          Wähle eine Design-Variante aus, um die verschiedenen Stile zu erkunden.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((design) => (
          <Link
            key={design.slug}
            href={design.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-xl"
          >
            <h2 className="text-xl font-semibold text-slate-900 group-hover:text-brand-green">
              {design.name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{design.description}</p>
            <div className="mt-4 text-sm font-medium text-brand-green">
              Ansehen →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

