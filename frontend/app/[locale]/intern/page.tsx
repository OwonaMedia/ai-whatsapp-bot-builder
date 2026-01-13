import { InternalDashboard } from './_components/InternalDashboard';
import { AccessDenied } from './_components/AccessDenied';
import { fetchInternalPortalData } from './data';
import { checkIPWhitelist } from '@/lib/ip-auth';

export const dynamic = 'force-dynamic';

export default async function InternalPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // IP-basierte Authentifizierung statt Login
  const { allowed, clientIP } = await checkIPWhitelist();

  if (!allowed) {
    return <AccessDenied clientIP={clientIP} />;
  }

  const data = await fetchInternalPortalData();

  return (
    <InternalDashboard
      locale={locale}
      data={data}
      sessionEmail="admin@owona.de"
    />
  );
}

