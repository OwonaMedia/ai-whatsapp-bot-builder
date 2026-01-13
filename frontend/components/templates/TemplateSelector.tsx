'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getAllTemplates, getTemplateByUseCase, customizeTemplate, UseCaseTemplate } from '@/lib/templates/useCaseTemplates';
import { Bot } from '@/types/bot';

interface TemplateSelectorProps {
  bot: Bot;
  onTemplateSelected: (flow: any) => void;
  onClose: () => void;
}

export default function TemplateSelector({ bot, onTemplateSelected, onClose }: TemplateSelectorProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<UseCaseTemplate | null>(null);
  const [companyName, setCompanyName] = useState('');

  const templates = getAllTemplates();

  const handleSelectTemplate = (template: UseCaseTemplate) => {
    setSelectedTemplate(template);
    if (!companyName) {
      // Suggest company name from bot name/description
      const suggested = bot.name || bot.description || '';
      setCompanyName(suggested);
    }
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    try {
      const customizedFlow = customizeTemplate(selectedTemplate, bot.name, companyName);
      
      onTemplateSelected(customizedFlow);
      
      addToast({
        type: 'success',
        title: 'Template geladen',
        message: `Das "${selectedTemplate.name}" Template wurde geladen. Du kannst es jetzt anpassen.`,
      });
      
      onClose();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Template konnte nicht geladen werden.',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Use-Case Template auswählen
              </h2>
              <p className="text-gray-600 mt-1">
                Wähle ein vorgefertigtes Template für deinen Bot
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Template Grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-brand-green bg-brand-light/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">
                    {template.useCaseType === 'customer_service' && '💬'}
                    {template.useCaseType === 'booking' && '📅'}
                    {template.useCaseType === 'ecommerce' && '🛒'}
                    {template.useCaseType === 'information' && '📰'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {template.description}
                    </p>
                    
                    {/* Suggested Knowledge Sources */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Empfohlene Wissensquellen:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.suggestedKnowledgeSources.map((source, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Company Name (optional) */}
          {selectedTemplate && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firmenname (optional, für Personalisierung):
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={bot.name || 'Dein Firmenname'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Wird in Willkommensnachrichten und AI-Prompts verwendet
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
            >
              Template laden
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

