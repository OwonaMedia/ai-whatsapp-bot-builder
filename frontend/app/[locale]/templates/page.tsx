'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { botTemplates, BotTemplate } from '@/lib/templates';
import HelpIcon from '@/components/ui/HelpIcon';

export const dynamic = 'force-dynamic';

const categoryLabels: Record<BotTemplate['category'], string> = {
  'customer-service': 'Kundenservice',
  'e-commerce': 'E-Commerce',
  'booking': 'Buchungen',
  'marketing': 'Marketing',
  'support': 'Support',
  'faq': 'FAQ',
};

export default function TemplatesPage() {
  const router = useRouter();
  const locale = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<BotTemplate['category'] | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const recommendedTemplate = botTemplates.find((t) => t.id === 'multi-tier-support');

  const categories: (BotTemplate['category'] | 'all')[] = ['all', ...Array.from(new Set(botTemplates.map((t) => t.category)))];

  const filteredTemplates =
    selectedCategory === 'all'
      ? botTemplates
      : botTemplates.filter((t) => t.category === selectedCategory);

  const handleUseTemplate = (template: BotTemplate) => {
    // Speichere Template-ID in localStorage für die Bot-Erstellung
    localStorage.setItem('selected-template', JSON.stringify(template));
    router.push(`/${locale}/bots/new?template=${template.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Vorlagen-Bibliothek
            </h1>
            <HelpIcon
              title="Vorlagen-Bibliothek"
              content="Wählen Sie aus vorgefertigten Bot-Vorlagen, um schnell loszulegen. Jede Vorlage enthält einen vorkonfigurierten Flow, den Sie anpassen können."
              size="md"
              position="bottom"
              docLink={`/${locale}/docs#templates`}
            />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Starten Sie schnell mit vorgefertigten Bot-Vorlagen. Wählen Sie eine Vorlage aus und
            passen Sie sie an Ihre Bedürfnisse an.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category === 'all' ? 'Alle' : categoryLabels[category]}
            </button>
          ))}
        </div>

        {recommendedTemplate && (
          <div className="mb-10 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-brand-green via-emerald-500 to-brand-dark text-white rounded-2xl shadow-xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="text-5xl md:text-6xl">🛡️</div>
              <div className="flex-1 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium uppercase tracking-wide">
                  Empfohlene Vorlage
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">{recommendedTemplate.name}</h2>
                <p className="text-white/90 leading-relaxed">
                  Automatisiere deinen kompletten Support-Workflow: Tier-1-Begrüßung, Silent Checks, Ticket-Erstellung und Eskalation an Tier-2 Spezialisten –
                  perfekt abgestimmt auf unseren Multi-Tier Kundenservice.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-white/90">
                  {recommendedTemplate.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="px-3 py-1 bg-white/15 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  handleUseTemplate(recommendedTemplate);
                }}
                className="w-full md:w-auto bg-white text-brand-green hover:text-white hover:bg-brand-dark"
              >
                Vorlage starten
              </Button>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-gray-100 flex flex-col"
            >
              {/* Icon & Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">{template.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                {template.id === 'multi-tier-support' && (
                  <span className="px-2 py-1 bg-brand-green/10 text-brand-green text-xs font-semibold rounded-full">
                    Empfohlen
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="mb-4 flex-1">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features:</h4>
                <ul className="space-y-1">
                  {template.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-brand-green mt-1">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {template.features.length > 3 && (
                    <li className="text-sm text-gray-500">
                      +{template.features.length - 3} weitere Features
                    </li>
                  )}
                </ul>
              </div>

              {/* Use Cases */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Einsatzbereiche:</h4>
                <div className="flex flex-wrap gap-2">
                  {template.useCases.slice(0, 2).map((useCase, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleUseTemplate(template)}
                >
                  Vorlage verwenden
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplate(template)}
                >
                  Vorschau
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Keine passende Vorlage gefunden?
          </p>
          <Link href={`/${locale}/bots/new`}>
            <Button variant="outline" size="lg">
              Bot von Grund auf erstellen
            </Button>
          </Link>
        </div>
      </div>

      {/* Vorlagen-Vorschau Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{selectedTemplate.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  <p className="text-gray-600">{selectedTemplate.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Features */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
                <ul className="grid md:grid-cols-2 gap-2">
                  {selectedTemplate.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-brand-green mt-1">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Use Cases */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Einsatzbereiche</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.useCases.map((useCase, idx) => (
                    <span
                      key={idx}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>

              {/* Flow Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Flow-Struktur</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                  Diese Vorlage enthält {selectedTemplate.flow.nodes.length} Nodes und{' '}
                  {selectedTemplate.flow.edges.length} Verbindungen.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(selectedTemplate.flow.nodes.map((n) => n.type))).map(
                      (type) => (
                        <span
                          key={type}
                          className="text-xs bg-brand-green/10 text-brand-green px-2 py-1 rounded"
                        >
                          {type}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    handleUseTemplate(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                >
                  Vorlage verwenden
                </Button>
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Schließen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

