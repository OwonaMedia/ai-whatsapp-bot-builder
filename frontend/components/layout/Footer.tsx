'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useSupportTicket } from '@/components/support/SupportTicketContext';
import PaymentLogos from '@/components/payments/PaymentLogos';

type CustomerLink =
  | { key: 'supportInbox' | 'monitoring' | 'support'; href: string; type?: 'link' }
  | { key: 'reportIssue'; type: 'ticket' };

export default function Footer() {
  const params = useParams();
  const locale = params.locale as string;
  const { openTicket } = useSupportTicket();

  // ✅ Use footer namespace explicitly
  const t = useTranslations('footer');
  const tPayments = useTranslations('payments');
  const supportEmail = 'support@owona.de';

  const currentYear = new Date().getFullYear();

  const customerLinks: CustomerLink[] = [
    { key: 'supportInbox', href: `/${locale}/support/messages` },
    { key: 'reportIssue', type: 'ticket' },
    { key: 'monitoring', href: `/${locale}/dashboard/monitoring` },
    { key: 'support', href: `mailto:${supportEmail}` },
  ];

  const handleOpenTicket = (source: string) => {
    openTicket({
      context: 'footer_report_issue',
      extra: {
        source,
      },
    });
  };

  return (
    <footer className="mt-auto bg-slate-950/90 text-slate-300 shadow-[0_-24px_60px_-48px_rgba(16,185,129,0.4)] backdrop-blur border-t border-white/10">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="mb-4 text-lg font-semibold text-emerald-200">{t('company.title')}</h3>
            <p className="text-sm text-slate-400 mb-4">{t('company.description')}</p>
            <p className="text-xs text-slate-500">
              © {currentYear} {t('company.copyright')}
            </p>
          </div>

          {/* Support & Monitoring */}
          <div>
            <h4 className="mb-4 text-md font-semibold text-emerald-200">{t('customer.title')}</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              {customerLinks.map((link) => (
                <li key={link.key}>
                  {link.type === 'ticket' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenTicket(link.key)}
                      className="w-full text-left transition-colors hover:text-emerald-200"
                    >
                      {t(`customer.${link.key}`)}
                    </button>
                  ) : (
                    <Link href={link.href} className="transition-colors hover:text-emerald-200">
                      {t(`customer.${link.key}`)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="mb-4 text-md font-semibold text-emerald-200">{t('legal.title')}</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link 
                  href={`/${locale}/legal/privacy`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${locale}/legal/cookies`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {t('legal.cookies')}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${locale}/legal/data-processing`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {t('legal.dataProcessing')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/legal/terms`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {t('legal.terms')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontakt & Ressourcen */}
          <div>
            <h4 className="mb-4 text-md font-semibold text-emerald-200">{t('contact.title')}</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link 
                  href={`/${locale}/pricing`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {tPayments('links.pricingLabel', { default: 'Preise' })}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${locale}/templates`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {tPayments('links.templatesLabel', { default: 'Vorlagen' })}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${locale}/docs`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {tPayments('links.docsLabel', { default: 'Dokumentation' })}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${locale}/resources`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {tPayments('links.resourcesLabel', { default: 'Ressourcen' })}
                </Link>
              </li>
              <li>
                <a 
                  href={`mailto:${t('contact.email')}`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {t('contact.email')}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${supportEmail}`}
                  className="transition-colors hover:text-emerald-200"
                >
                  {supportEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
              {tPayments('supportedMethodsLabel')}
            </span>
            <div className="flex items-center">
              <PaymentLogos size="sm" variant="inline" subdued />
            </div>
            <p className="text-xs text-slate-500 md:text-right">
              {tPayments('trust.footerNote')}
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-500 md:flex-row">
            <p className="text-center md:text-left">{t('disclaimer')}</p>
            <p>{t('rights')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

