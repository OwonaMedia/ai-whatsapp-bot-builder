import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CheckoutForm } from '@/components/payments/CheckoutForm';
import { getUserSubscription } from '@/lib/subscriptions';
import type { SubscriptionTier } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

interface CheckoutPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ 
    tier?: SubscriptionTier;
    amount?: string;
    currency?: string;
    billing_cycle?: 'monthly' | 'yearly';
  }>;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { locale } = await params;
  const searchParamsData = await searchParams;

  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Checkout</h1>
        <p className="mt-3 text-sm text-gray-600">
          Im Produktionsbetrieb wird diese Seite dynamisch mit Supabase-Daten gefüllt. Während des
          Builds werden keine externen Zahlungsabfragen durchgeführt.
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
    redirect(`/${locale}/auth/login?redirect=/${locale}/checkout`);
  }

  // Subscription-Tier und Betrag bestimmen
  const tier = (searchParamsData.tier || 'starter') as SubscriptionTier;
  const billingCycle = searchParamsData.billing_cycle || 'monthly';
  const currency = searchParamsData.currency || 'EUR';
  
  // Pricing basierend auf Tier und Billing Cycle
  const pricing: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
    free: { monthly: 0, yearly: 0 },
    starter: { monthly: 29, yearly: 290 }, // ~2 Monate geschenkt
    professional: { monthly: 99, yearly: 990 }, // ~2 Monate geschenkt
    enterprise: { monthly: 299, yearly: 2990 }, // ~2 Monate geschenkt
  };

  const amount = searchParamsData.amount 
    ? parseFloat(searchParamsData.amount)
    : pricing[tier][billingCycle];

  if (!amount || amount <= 0) {
    redirect(`/${locale}/pricing`);
  }

  // Aktuelle Subscription prüfen
  const currentSubscription = await getUserSubscription(user.id);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Checkout
          </h1>
          <p className="mt-2 text-gray-600">
            Schließen Sie Ihre Bestellung ab
          </p>
        </div>

        <CheckoutForm
          amount={amount}
          currency={currency}
          userId={user.id}
          subscriptionId={currentSubscription?.tier || tier}
          description={`WhatsApp Bot Builder - ${tier} Plan (${billingCycle})`}
          customerEmail={user.email || undefined}
          customerName={user.user_metadata?.full_name || undefined}
          locale={locale}
          billingCycle={billingCycle as 'monthly' | 'yearly'}
        />
      </div>
    </div>
  );
}

