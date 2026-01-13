'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Bot } from '@/types/bot';
import { createClient } from '@/lib/supabase';
import { MetaOAuthButton } from './MetaOAuthButton';
import { PhoneVerificationStep } from './PhoneVerificationStep';
import { MetaGraphAPIClient } from '@/lib/whatsapp/meta-client';

interface WhatsAppInhouseSetupWizardProps {
  bot: Bot;
  userId: string;
  onComplete?: () => void;
  onClose?: () => void;
}

type SetupStep = 'oauth' | 'phone' | 'webhook' | 'complete';

export default function WhatsAppInhouseSetupWizard({
  bot,
  userId,
  onComplete,
  onClose,
}: WhatsAppInhouseSetupWizardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState<SetupStep>('oauth');
  const [isLoading, setIsLoading] = useState(false);
  
  // OAuth state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [businessAccountId, setBusinessAccountId] = useState<string | null>(null);
  
  // Phone verification state
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  
  // Webhook state
  const [webhookConfigured, setWebhookConfigured] = useState(false);

  // Check if already connected
  useEffect(() => {
    const checkExistingConnection = async () => {
      const whatsappConfig = (bot.bot_config as any)?.whatsapp;
      if (whatsappConfig?.provider === 'meta-direct' && whatsappConfig?.access_token) {
        setAccessToken(whatsappConfig.access_token);
        setBusinessAccountId(whatsappConfig.business_account_id);
        
        if (whatsappConfig.phone_number_id) {
          setPhoneNumberId(whatsappConfig.phone_number_id);
          setCurrentStep('webhook');
        } else {
          setCurrentStep('phone');
        }
        
        if (whatsappConfig.webhook_url) {
          setWebhookConfigured(true);
        }
      }
    };
    
    checkExistingConnection();
  }, [bot]);

  const handleOAuthSuccess = () => {
    // OAuth success is handled via redirect, so we check URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('whatsapp_connected') === 'true') {
      // Reload bot data to get updated config
      window.location.reload();
    }
  };

  const handlePhoneVerified = async (verifiedPhoneId: string) => {
    setPhoneNumberId(verifiedPhoneId);
    
    // Save phone number to bot config
    try {
      setIsLoading(true);
      const supabase = createClient();
      const currentConfig = (bot.bot_config as any) || {};
      
      const { error } = await supabase
        .from('bots')
        .update({
          bot_config: {
            ...currentConfig,
            whatsapp: {
              ...currentConfig.whatsapp,
              phone_number_id: verifiedPhoneId,
            },
          },
        })
        .eq('id', bot.id);

      if (error) throw error;

      setCurrentStep('webhook');
      addToast({
        type: 'success',
        title: 'Telefonnummer gespeichert',
        message: 'Die Telefonnummer wurde erfolgreich verifiziert und gespeichert',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error instanceof Error ? error.message : 'Telefonnummer konnte nicht gespeichert werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigureWebhook = async () => {
    if (!accessToken || !businessAccountId || !phoneNumberId) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte schließen Sie zuerst OAuth und Telefonnummer-Verifizierung ab',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp`;
      const verifyToken = Math.random().toString(36).substring(2, 15);

      const response = await fetch('/api/whatsapp/meta/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: bot.id,
          webhookUrl,
          verifyToken,
          fields: ['messages', 'message_status'],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Webhook-Konfiguration fehlgeschlagen');
      }

      setWebhookConfigured(true);
      setCurrentStep('complete');
      
      addToast({
        type: 'success',
        title: 'Webhook konfiguriert',
        message: 'Der Webhook wurde erfolgreich konfiguriert',
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error instanceof Error ? error.message : 'Webhook konnte nicht konfiguriert werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'oauth':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Inhouse-Setup (Empfohlen)</h3>
              <p className="text-sm text-blue-800 mb-3">
                Verbinden Sie sich direkt mit Meta/Facebook Business Manager. 
                <strong> Setup-Zeit: 5-10 Minuten!</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>✅ Direkte Meta-Integration</li>
                <li>✅ Keine BSP-Gebühren</li>
                <li>✅ Volle Kontrolle über Daten</li>
                <li>✅ DSGVO-konform</li>
                <li>✅ Phone Verification KOSTENLOS</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Schritt 1: Mit Facebook Business Manager verbinden</h4>
              <p className="text-sm text-gray-600 mb-4">
                Klicken Sie auf den Button unten, um sich mit Ihrem Facebook Business Manager zu verbinden.
                Sie werden zu Meta weitergeleitet, um die Berechtigung zu erteilen.
              </p>
              
              {accessToken && businessAccountId ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Erfolgreich mit Facebook Business Manager verbunden
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentStep('phone')}
                    className="mt-4"
                  >
                    Weiter zur Telefonnummer-Verifizierung
                  </Button>
                </div>
              ) : (
                <MetaOAuthButton
                  botId={bot.id}
                  userId={userId}
                  onSuccess={handleOAuthSuccess}
                />
              )}
            </div>
          </div>
        );

      case 'phone':
        if (!accessToken || !businessAccountId) {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                Bitte schließen Sie zuerst die OAuth-Verbindung ab.
              </p>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('oauth')}
                className="mt-4"
              >
                Zurück zu OAuth
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Schritt 2: Telefonnummer verifizieren</h4>
              <p className="text-sm text-gray-600 mb-4">
                Wählen Sie eine Telefonnummer aus und verifizieren Sie sie. 
                Die Verifizierung ist <strong>kostenlos</strong> - Meta sendet den Code selbst.
              </p>
              
              <PhoneVerificationStep
                accessToken={accessToken}
                businessAccountId={businessAccountId}
                onVerified={handlePhoneVerified}
                onSkip={() => setCurrentStep('webhook')}
              />
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Schritt 3: Webhook konfigurieren</h4>
              <p className="text-sm text-gray-600 mb-4">
                Konfigurieren Sie den Webhook, damit WhatsApp-Nachrichten an Ihren Bot weitergeleitet werden.
              </p>
              
              {webhookConfigured ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-4">
                    ✓ Webhook wurde erfolgreich konfiguriert
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentStep('complete')}
                  >
                    Fertigstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>Webhook URL:</strong> {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : ''}
                    </p>
                    <p className="text-xs text-gray-600">
                      Diese URL wird automatisch konfiguriert.
                    </p>
                  </div>
                  
                  <Button
                    variant="primary"
                    onClick={handleConfigureWebhook}
                    isLoading={isLoading}
                    className="w-full"
                  >
                    Webhook konfigurieren
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="font-semibold text-green-900 mb-2 text-xl">
                Setup erfolgreich abgeschlossen!
              </h3>
              <p className="text-sm text-green-800 mb-4">
                Ihr WhatsApp Bot ist jetzt vollständig konfiguriert und einsatzbereit.
              </p>
              <div className="space-y-2 text-sm text-green-700">
                <p>✓ Mit Facebook Business Manager verbunden</p>
                {phoneNumberId && <p>✓ Telefonnummer verifiziert</p>}
                {webhookConfigured && <p>✓ Webhook konfiguriert</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = [
    { id: 'oauth', label: 'OAuth', number: 1 },
    { id: 'phone', label: 'Telefonnummer', number: 2 },
    { id: 'webhook', label: 'Webhook', number: 3 },
    { id: 'complete', label: 'Fertig', number: 4 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WhatsApp Business API Setup (Inhouse)
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Schritt {currentStepIndex + 1} von {steps.length}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-2 rounded ${
                    index <= currentStepIndex
                      ? 'bg-brand-green'
                      : 'bg-gray-200'
                  }`}
                  title={step.label}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {steps.map((step) => (
                <span key={step.id}>{step.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 'oauth') {
                onClose?.();
              } else if (currentStep === 'phone') {
                setCurrentStep('oauth');
              } else if (currentStep === 'webhook') {
                setCurrentStep('phone');
              }
            }}
            disabled={currentStep === 'oauth' || currentStep === 'complete'}
          >
            Zurück
          </Button>
          <div className="flex gap-2">
            {onClose && currentStep !== 'complete' && (
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
            )}
            {currentStep === 'complete' && (
              <Button
                variant="primary"
                onClick={() => {
                  onComplete?.();
                  onClose?.();
                }}
              >
                Schließen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

