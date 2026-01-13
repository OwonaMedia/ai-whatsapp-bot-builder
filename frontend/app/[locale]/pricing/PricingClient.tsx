'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import HelpIcon from '@/components/ui/HelpIcon';
import { createClient } from '@/lib/supabase';
import PaymentLogos from '@/components/payments/PaymentLogos';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceYearly?: number;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  limits: {
    bots: number | string;
    messages: number | string;
    support: string;
  };
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfekt zum Ausprobieren',
    features: [
      '1 Bot',
      '100 Nachrichten/Monat',
      'Basis-Features',
      'Community Support',
      'DSGVO-konform',
      'EU-Datenhaltung',
    ],
    cta: 'Kostenlos starten',
    limits: {
      bots: 1,
      messages: '100/Monat',
      support: 'Community',
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceYearly: 290, // 2 Monate geschenkt
    description: 'Für kleine Unternehmen',
    features: [
      '3 Bots',
      '1.000 Nachrichten/Monat',
      'Alle Features',
      'E-Mail-Support',
      'Analytics Export',
      'Template-Bibliothek',
      'DSGVO-konform',
      'EU-Datenhaltung',
    ],
    popular: true,
    cta: 'Jetzt starten',
    limits: {
      bots: 3,
      messages: '1.000/Monat',
      support: 'E-Mail',
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    priceYearly: 990, // 2 Monate geschenkt
    description: 'Für wachsende Unternehmen',
    features: [
      '10 Bots',
      '10.000 Nachrichten/Monat',
      'Advanced Analytics',
      'Priority Support',
      'API Access',
      'Custom Integrations',
      'Funnel-Analyse',
      'White Label Option',
      'DSGVO-konform',
      'EU-Datenhaltung',
    ],
    cta: 'Jetzt upgraden',
    limits: {
      bots: 10,
      messages: '10.000/Monat',
      support: 'Priority',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom
    description: 'Für große Unternehmen',
    features: [
      'Unlimited Bots',
      'Unlimited Nachrichten',
      'Dedicated Support',
      'Custom Integration',
      'SLA Garantie',
      'On-Premise Option',
      'Team-Management',
      'Advanced Security',
      'DSGVO-konform',
      'EU-Datenhaltung',
    ],
    cta: 'Kontakt aufnehmen',
    limits: {
      bots: 'Unlimited',
      messages: 'Unlimited',
      support: 'Dedicated',
    },
  },
];

function PricingPageContent() {
  try {
  const locale = useLocale();
  const pricingT = useTranslations('home.pricingPage');
  const router = useRouter();
  if (typeof window === 'undefined') {
    console.log('[PricingPage] render start on server', { locale });
  }
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [user, setUser] = useState<any>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [roiInput, setRoiInput] = useState({
    industry: 'agency',
    leadsPerMonth: 120,
    closeRate: 18,
    averageDeal: 240,
    supportTickets: 70,
    supportCost: 4,
  });

  const formatCurrency = useMemo(
    () =>
      new Intl.NumberFormat(locale || 'de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const industryConfig = {
    agency: {
      uplift: 0.12,
      messageMultiplier: 6,
    },
    ecommerce: {
      uplift: 0.18,
      messageMultiplier: 8,
    },
    service: {
      uplift: 0.15,
      messageMultiplier: 5,
    },
  } as const;

  const currentIndustry = industryConfig[roiInput.industry as keyof typeof industryConfig] || industryConfig.agency;
  const baselineConversions = roiInput.leadsPerMonth * (roiInput.closeRate / 100);
  const additionalConversions = baselineConversions * currentIndustry.uplift;
  const additionalRevenue = additionalConversions * roiInput.averageDeal;
  const supportSavings = roiInput.supportTickets * roiInput.supportCost * 0.4;
  const monthlyBenefit = Math.max(0, additionalRevenue + supportSavings);
  const yearlyBenefit = monthlyBenefit * 12;
  const estimatedMessages = Math.round(
    roiInput.leadsPerMonth * currentIndustry.messageMultiplier + roiInput.supportTickets * 4
  );

  const determineRecommendedTier = () => {
    if (estimatedMessages <= 100) return 'free';
    if (estimatedMessages <= 1000) return 'starter';
    if (estimatedMessages <= 10000) return 'professional';
    return 'enterprise';
  };

  const recommendedTierId = determineRecommendedTier();
  const recommendedTier = pricingTiers.find((tier) => tier.id === recommendedTierId) || pricingTiers[1];
  // recommendedTier is guaranteed to exist due to fallback to pricingTiers[1]
  if (!recommendedTier) {
    throw new Error('No pricing tier available');
  }
  const recommendedTierPrice = recommendedTier.price || 0;
  const roiMultiple = recommendedTierPrice > 0 ? monthlyBenefit / recommendedTierPrice : null;

  const onboardingSteps = ['account', 'connect', 'launch'].map((key, index) => ({
    key,
    index: index + 1,
    title: pricingT(`onboarding.steps.${key}.title`),
    description: pricingT(`onboarding.steps.${key}.description`),
  }));

  const handleNumericChange = (key: keyof typeof roiInput) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value || 0);
    setRoiInput((prev) => ({ ...prev, [key]: isNaN(value) ? 0 : value }));
  };

  const handleIndustryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRoiInput((prev) => ({ ...prev, industry: event.target.value as keyof typeof industryConfig }));
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale || 'de-DE', options).format(value);
  
  // User und aktuelle Subscription abrufen
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setUser(authUser);
          
          // Aktuelle Subscription abrufen
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('tier, status')
            .eq('user_id', authUser.id)
            .single();
          
          if (subscription && subscription.status === 'active') {
            setCurrentTier(subscription.tier);
          }
        }
      } catch (error) {
        console.error('[Pricing] Error checking user:', error);
      }
    };
    
    checkUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {pricingT('header.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {pricingT('header.subtitle')}
          </p>
          {/* Payment Logos */}
          <div className="flex items-center justify-center">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 px-4 py-3">
              <PaymentLogos size="md" variant="inline" subdued />
            </div>
          </div>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              {pricingT('header.billing.monthly')}
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-brand-green' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              {pricingT('header.billing.yearly')}
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {pricingT('header.billing.yearlyTag')}
              </span>
            </span>
          </div>
        </div>

        {/* Onboarding & ROI */}
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 mb-16">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{pricingT('roi.title')}</h2>
                <p className="text-sm md:text-base text-gray-600 max-w-2xl">{pricingT('roi.subtitle')}</p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
                <span className="inline-flex h-2 w-2 rounded-full bg-brand-green" />
                {pricingT('roi.disclaimerTagline')}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {pricingT('roi.fields.industry')}
                  </label>
                  <select
                    value={roiInput.industry}
                    onChange={handleIndustryChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="agency">{pricingT('roi.industries.agency')}</option>
                    <option value="ecommerce">{pricingT('roi.industries.ecommerce')}</option>
                    <option value="service">{pricingT('roi.industries.service')}</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {pricingT('roi.fields.leadsPerMonth')}
                    <HelpIcon content={pricingT('roi.help.leads')} />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={roiInput.leadsPerMonth}
                    onChange={handleNumericChange('leadsPerMonth')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {pricingT('roi.fields.closeRate')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={roiInput.closeRate}
                      onChange={handleNumericChange('closeRate')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green pr-10"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {pricingT('roi.fields.averageDeal')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      min={0}
                      value={roiInput.averageDeal}
                      onChange={handleNumericChange('averageDeal')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-7 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {pricingT('roi.fields.supportTickets')}
                    <HelpIcon content={pricingT('roi.help.supportTickets')} />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={roiInput.supportTickets}
                    onChange={handleNumericChange('supportTickets')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {pricingT('roi.fields.supportCost')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      min={0}
                      value={roiInput.supportCost}
                      onChange={handleNumericChange('supportCost')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-7 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">{pricingT('roi.fields.supportCostUnit')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-brand-green/5 border border-brand-green/30 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-green font-semibold mb-2">
                  {pricingT('roi.results.monthlyBenefitLabel')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency.format(monthlyBenefit)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatCurrency.format(Math.max(0, additionalRevenue))}
                    </p>
                    <p>{pricingT('roi.results.additionalRevenue')}</p>
                  </div>
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatCurrency.format(Math.max(0, supportSavings))}
                    </p>
                    <p>{pricingT('roi.results.supportSavings')}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {pricingT('roi.results.disclaimer')}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                    {pricingT('roi.results.recommendedPlanLabel')}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{recommendedTier.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {pricingT('roi.results.recommendedPlanDescription', {
                      messages: formatNumber(estimatedMessages, { maximumFractionDigits: 0 }),
                    })}
                  </p>
                  <div className="space-y-2 text-sm text-gray-700">
                  {recommendedTierPrice > 0 ? (
                    <p>
                      {pricingT('roi.results.planPricing', {
                        price: formatCurrency.format(recommendedTierPrice),
                      })}
                    </p>
                  ) : (
                      <p>{pricingT('roi.results.planCustom')}</p>
                    )}
                    <p>
                    {pricingT('roi.results.yearlyBenefit', {
                      value: formatCurrency.format(yearlyBenefit),
                    })}
                    </p>
                    {roiMultiple && roiMultiple > 0 ? (
                      <p className="text-sm text-brand-green font-medium">
                        {pricingT('roi.results.roiMultiple', {
                          multiple: formatNumber(roiMultiple, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </p>
                    ) : (
                      <p className="text-sm text-brand-green font-medium">
                        {pricingT('roi.results.coveredBySavings')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  {recommendedTier.id === 'enterprise' ? (
                    <Link href={`/${locale}/contact`}>
                      <Button variant="primary" className="w-full" size="lg">
                        {pricingT('roi.results.ctaEnterprise')}
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/${locale}/checkout?tier=${recommendedTier.id}&billing_cycle=${billingCycle}`}>
                      <Button variant="primary" className="w-full" size="lg">
                        {pricingT('roi.results.ctaStart')}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{pricingT('onboarding.title')}</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              {pricingT('onboarding.subtitle')}
            </p>
            <div className="space-y-4 mb-6">
              {onboardingSteps.map((step) => (
                <div key={step.key} className="flex gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-brand-green/10 text-brand-green font-semibold">
                    {step.index}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-xs text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <Link href={`/${locale}/auth/signup?onboarding=assistant`}>
                <Button variant="primary" size="lg" className="w-full">
                  {pricingT('onboarding.ctaPrimary')}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => router.push(`/${locale}/docs`)}
              >
                {pricingT('onboarding.ctaSecondary')}
              </Button>
              <p className="text-xs text-gray-500 text-center">{pricingT('onboarding.footnote')}</p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white rounded-lg shadow-lg p-8 relative ${
                tier.popular ? 'ring-2 ring-brand-green scale-105' : ''
              } ${currentTier === tier.id ? 'ring-2 ring-blue-500' : ''}`}
            >
              {currentTier === tier.id && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Aktueller Plan
                  </span>
                </div>
              )}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-brand-green text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Beliebt
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                
                <div className="flex items-baseline gap-2">
                  {tier.price === 0 ? (
                    <span className="text-4xl font-bold text-gray-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">
                        €{billingCycle === 'yearly' && tier.priceYearly ? tier.priceYearly : tier.price}
                      </span>
                      <span className="text-gray-500">
                        /{billingCycle === 'yearly' ? 'Jahr' : 'Monat'}
                      </span>
                    </>
                  )}
                </div>
                
                {billingCycle === 'yearly' && tier.priceYearly && tier.price > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    €{Math.round(tier.priceYearly / 12)}/Monat bei jährlicher Zahlung
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bots:</span>
                    <span className="font-semibold text-gray-900">{tier.limits.bots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nachrichten:</span>
                    <span className="font-semibold text-gray-900">{tier.limits.messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Support:</span>
                    <span className="font-semibold text-gray-900">{tier.limits.support}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5"
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
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {(() => {
                const isCurrentTier = currentTier === tier.id;
                const tierOrder = ['free', 'starter', 'professional', 'enterprise'];
                const currentTierIndex = tierOrder.indexOf(currentTier || 'free');
                const thisTierIndex = tierOrder.indexOf(tier.id);
                const isLowerTier = thisTierIndex < currentTierIndex;
                const isHigherTier = thisTierIndex > currentTierIndex;
                
                // Enterprise: Immer Kontakt-Link
                if (tier.id === 'enterprise') {
                  return (
                    <Link href={`/${locale}/contact`}>
                      <Button
                        variant={tier.popular ? 'primary' : 'outline'}
                        className="w-full"
                        size="lg"
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  );
                }
                
                // Aktueller Tier: Ausgegraut
                if (isCurrentTier) {
                  return (
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      disabled
                    >
                      Aktueller Plan
                    </Button>
                  );
                }
                
                // Niedrigerer Tier: Ausgegraut
                if (isLowerTier && user) {
                  return (
                    <Button
                      variant="outline"
                      className="w-full opacity-50 cursor-not-allowed"
                      size="lg"
                      disabled
                    >
                      Downgrade nicht verfügbar
                    </Button>
                  );
                }
                
                // Höherer Tier oder nicht angemeldet
                if (user) {
                  // Angemeldet: Zur Checkout-Seite
                  return (
                    <Link href={`/${locale}/checkout?tier=${tier.id}&billing_cycle=${billingCycle}`}>
                      <Button
                        variant={tier.popular ? 'primary' : 'outline'}
                        className="w-full"
                        size="lg"
                      >
                        {isHigherTier ? 'Jetzt upgraden' : tier.cta}
                      </Button>
                    </Link>
                  );
                } else {
                  // Nicht angemeldet: Zur Signup-Seite
                  return (
                    <Link href={`/${locale}/auth/signup?plan=${tier.id}`}>
                      <Button
                        variant={tier.popular ? 'primary' : 'outline'}
                        className="w-full"
                        size="lg"
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  );
                }
              })()}
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Häufige Fragen</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Kann ich den Plan später wechseln?</h3>
              <p className="text-gray-600">
                Ja, Sie können jederzeit upgraden oder downgraden. Änderungen werden anteilig
                verrechnet.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Was passiert bei Überschreitung der Limits?</h3>
              <p className="text-gray-600">
                Sie erhalten eine Benachrichtigung und können entweder upgraden oder zusätzliche
                Nachrichten einzeln kaufen.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Gibt es eine Kündigungsfrist?</h3>
              <p className="text-gray-600">
                Nein, Sie können jederzeit kündigen. Ihre Daten bleiben 30 Tage nach Kündigung
                verfügbar.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sichere Zahlungsmethoden</h2>
            <p className="text-gray-600">Wir akzeptieren alle gängigen Zahlungsmethoden</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-wrap items-center justify-center gap-8">
              <Image src="/payment-logos/visa.svg" alt="Visa" width={60} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              <Image src="/payment-logos/mastercard.svg" alt="Mastercard" width={60} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              <Image src="/payment-logos/paypal.svg" alt="PayPal" width={80} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              <Image src="/payment-logos/stripe.svg" alt="Stripe" width={70} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              <Image src="/payment-logos/apple-pay.svg" alt="Apple Pay" width={60} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              <Image src="/payment-logos/google-pay.svg" alt="Google Pay" width={60} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              <Image src="/payment-logos/klarna.svg" alt="Klarna" width={70} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>SSL-verschlüsselt</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>DSGVO-konform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('[PricingPage] render error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Etwas ist schiefgelaufen</h1>
          <p className="text-gray-600">
            Bitte lade die Seite neu oder gehe zurück zur Startseite.
          </p>
          <Link href="/">
            <Button variant="primary" className="w-full">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}

export default function PricingPageClient() {
  return <PricingPageContent />;
}