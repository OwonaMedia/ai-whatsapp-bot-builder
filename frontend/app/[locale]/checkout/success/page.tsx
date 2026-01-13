import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Button } from '@/components/ui/Button';
import PaymentLogos from '@/components/payments/PaymentLogos';
import Link from 'next/link';

interface CheckoutSuccessPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ 
    session_id?: string;
    payment_intent?: string;
    order_id?: string;
  }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: CheckoutSuccessPageProps) {
  const { locale } = await params;
  const searchParamsData = await searchParams;

  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Zahlung erfolgreich
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Im Live-Betrieb wird hier der Zahlungsstatus aus Supabase angezeigt. Während des Builds
          werden keine externen Abfragen ausgeführt.
        </p>
      </div>
    );
  }

  // User-Authentifizierung prüfen
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Zahlung erfolgreich!
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Vielen Dank für Ihre Zahlung. Ihre Subscription wird aktiviert, sobald die Zahlung verarbeitet wurde.
          </p>

          {searchParamsData.session_id && (
            <p className="text-sm text-gray-500 mb-8">
              Session ID: {searchParamsData.session_id}
            </p>
          )}

          <div className="space-y-4">
            <Link href={`/${locale}/dashboard`}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Zum Dashboard
              </Button>
            </Link>

            <div>
              <Link href={`/${locale}/settings`}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Subscription verwalten
                </Button>
              </Link>
            </div>
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center">
                <PaymentLogos size="sm" variant="inline" subdued />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




