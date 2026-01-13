import GeoViewerClient from './GeoViewerClient';
import { locales } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function GeoViewerPage() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <GeoViewerClient />
    </main>
  );
}

