import LoginForm from '@/components/auth/LoginForm';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Login Page - Simplified version without server-side auth check
 * Auth check wird im LoginForm durchgeführt
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const searchParamsData = await searchParams;
  
  // Enable static rendering
  setRequestLocale(locale);

  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Login</h1>
        <p className="mt-3 text-sm text-gray-600">
          Während des Builds werden keine Supabase-Aufrufe ausgeführt. Im Live-Betrieb erscheint hier das Loginformular.
        </p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <LoginForm redirectTo={searchParamsData.redirect || '/dashboard'} />
      </div>
    </div>
  );
}
