'use client';

import Link from 'next/link';
import RAGDemo from '@/components/demo/RAGDemo';

interface HomePageClientProps {
  translations: {
    (key: string): string;
    raw: (key: string) => any;
  };
  locale: string;
}

export function HomePageClient({ translations: t, locale }: HomePageClientProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {t('home.subtitle')}
          </p>
          <p className="text-lg text-gray-500 mb-6">
            Domain: <span className="font-mono text-brand-green">whatsapp.owona.de</span>
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href={`/${locale}/auth/login`}
              className="px-6 py-3 bg-brand-green text-white rounded-lg font-semibold hover:bg-brand-dark transition-colors"
            >
              {t('home.startNow')}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="px-6 py-3 bg-white text-brand-green border-2 border-brand-green rounded-lg font-semibold hover:bg-brand-light/20 transition-colors"
            >
              {t('home.dashboard')}
            </Link>
          </div>
        </div>

        {/* Interactive RAG Demo */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('home.ragDemo.title')}
              </h2>
              <p className="text-gray-600">
                {t('home.ragDemo.description')}
              </p>
            </div>
            <RAGDemo />
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="font-semibold text-lg mb-2">{t('home.features.dsgvo.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('home.features.dsgvo.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="font-semibold text-lg mb-2">{t('home.features.ai.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('home.features.ai.description')}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="font-semibold text-lg mb-2">{t('home.features.nocode.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('home.features.nocode.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

