'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import BotBuilder from '@/components/bot-builder/BotBuilder';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { BotFlow } from '@/types/bot';
import { getTemplateById, BotTemplate } from '@/lib/templates';

function NewBotPageContent() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [template, setTemplate] = useState<BotTemplate | null>(null);
  const [flow, setFlow] = useState<BotFlow>({
    name: '',
    nodes: [],
    edges: [],
  });

  // ✅ Fix Hydration Mismatch: Warte bis Client-seitig gerendert
  useEffect(() => {
    setMounted(true);
    
    // Prüfe ob Template aus URL oder localStorage geladen werden soll
    const templateId = searchParams.get('template');
    if (templateId) {
      const loadedTemplate = getTemplateById(templateId);
      if (loadedTemplate) {
        setTemplate(loadedTemplate);
        // Initialisiere Flow aus Template
        setFlow({
          ...loadedTemplate.flow,
          name: loadedTemplate.name, // Verwende Template-Name als Bot-Name
        });
        addToast({
          type: 'success',
          title: 'Vorlage geladen',
          message: `Vorlage "${loadedTemplate.name}" geladen. Sie können sie jetzt anpassen.`,
        });
      }
    } else {
      // Prüfe localStorage für Template (falls von Templates-Seite)
      const storedTemplate = localStorage.getItem('selected-template');
      if (storedTemplate) {
        try {
          const parsedTemplate = JSON.parse(storedTemplate) as BotTemplate;
          setTemplate(parsedTemplate);
          setFlow({
            ...parsedTemplate.flow,
            name: parsedTemplate.name,
          });
          localStorage.removeItem('selected-template'); // Cleanup
          addToast({
            type: 'success',
            title: 'Vorlage geladen',
            message: `Vorlage "${parsedTemplate.name}" geladen.`,
          });
        } catch (error) {
          console.error('Error parsing template from localStorage:', error);
        }
      }
    }
  }, [searchParams, addToast]);

  const handleCancel = () => {
    router.push('/dashboard');
  };

  // ✅ Verhindere Hydration-Mismatch durch client-only Rendering
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('bots.create.title') || 'Neuen Bot erstellen'}
            </h1>
            <p className="text-gray-600">
              {t('bots.create.description') || 'Erstellen Sie Ihren WhatsApp Bot mit dem visuellen Flow-Builder'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Lade...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('bots.create.title') || 'Neuen Bot erstellen'}
              </h1>
              <p className="text-gray-600">
                {t('bots.create.description') || 'Erstellen Sie Ihren WhatsApp Bot mit dem visuellen Flow-Builder'}
              </p>
              {template && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Vorlage:</span>
                  <span className="text-sm font-medium text-brand-green">
                    {template.icon} {template.name}
                  </span>
                </div>
              )}
            </div>
            <Link href={`/${locale}/templates`}>
              <Button variant="outline">
                📚 Vorlagen durchsuchen
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <BotBuilder
            mode="create"
            initialFlow={flow}
            onFlowChange={setFlow}
          />
        </div>
      </div>
    </div>
  );
}

export default function NewBotPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Neuen Bot erstellen
            </h1>
            <p className="text-gray-600">
              Lade...
            </p>
          </div>
        </div>
      </div>
    }>
      <NewBotPageContent />
    </Suspense>
  );
}

