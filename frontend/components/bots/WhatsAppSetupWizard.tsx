'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Bot } from '@/types/bot';
import { createClient } from '@/lib/supabase';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';
import WhatsAppInhouseSetupWizard from './WhatsAppInhouseSetupWizard';

interface WhatsAppSetupWizardProps {
  bot: Bot;
  onComplete?: () => void;
  onClose?: () => void;
}

type SetupMethod = 'inhouse' | 'bsp' | 'meta-direct';

const BSP_PROVIDERS = [
  {
    id: '360dialog',
    name: '360dialog',
    description: 'Offizieller Meta BSP - Schnellster Setup (empfohlen)',
    logo: '🔷',
    setupTime: '2 Minuten',
    features: ['Keine Meta-Verifizierung nötig', 'OAuth-Integration', 'Sofort loslegen', '✅ EU-Datenhaltung (DSGVO)'],
    oauthUrl: process.env.NEXT_PUBLIC_360DIALOG_OAUTH_URL || 'https://360dialog.com/oauth',
    website: 'https://360dialog.com',
    gdprCompliant: true,
    euDataResidency: true,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Enterprise-Grade WhatsApp API',
    logo: '🔴',
    setupTime: '5 Minuten',
    features: ['Weltweit verfügbar', 'Enterprise Support', 'Einfache Integration', '⚠️ EU-Data-Residency optional'],
    oauthUrl: process.env.NEXT_PUBLIC_TWILIO_OAUTH_URL || 'https://twilio.com/oauth',
    website: 'https://twilio.com',
    gdprCompliant: true,
    euDataResidency: false, // Optional, muss aktiviert werden
  },
  {
    id: 'messagebird',
    name: 'MessageBird',
    description: 'Global Communication Platform',
    logo: '🐦',
    setupTime: '5 Minuten',
    features: ['Multi-Channel', 'Global Coverage', 'API-First', '⚠️ DSGVO-konform (AVV erforderlich)'],
    oauthUrl: process.env.NEXT_PUBLIC_MESSAGEBIRD_OAUTH_URL || 'https://messagebird.com/oauth',
    website: 'https://messagebird.com',
    gdprCompliant: true,
    euDataResidency: false,
  },
];

export default function WhatsAppSetupWizard({ bot, onComplete, onClose }: WhatsAppSetupWizardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [setupMethod, setSetupMethod] = useState<SetupMethod | null>(null);
  const [selectedBSP, setSelectedBSP] = useState<string | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [gdprDataProcessing, setGdprDataProcessing] = useState(false);
  const [showInhouseWizard, setShowInhouseWizard] = useState(false);
  
  // Get current user ID from Supabase
  const [userId, setUserId] = useState<string>('');
  
  useEffect(() => {
    const getUserId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);
  
  // Form Data (only for meta-direct fallback)
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  // BSP API Key/Credentials (for each BSP)
  const [bspCredentials, setBspCredentials] = useState<{
    '360dialog'?: { apiKey: string };
    'twilio'?: { accountSid: string; authToken: string };
    'messagebird'?: { apiKey: string };
  }>({});
  
  const [showBSPInstructions, setShowBSPInstructions] = useState<string | null>(null);

  // Generate webhook URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/api/webhooks/whatsapp`;
      setVerifyToken(Math.random().toString(36).substring(2, 15)); // Auto-generate verify token
    }
  }, []);

  const handleBSPConnect = async (bspId: string) => {
    const bsp = BSP_PROVIDERS.find(p => p.id === bspId);
    if (!bsp) return;

    // DSGVO-Check: Consent erforderlich
    if (!gdprConsent || !gdprDataProcessing) {
      addToast({
        type: 'error',
        title: 'DSGVO-Zustimmung erforderlich',
        message: 'Bitte stimmen Sie der Datenverarbeitung zu, um fortzufahren.',
      });
      return;
    }

    // Validate credentials based on BSP
    let credentials: string;
    
    if (bspId === '360dialog') {
      const creds = bspCredentials['360dialog'];
      if (!creds?.apiKey || !creds.apiKey.trim()) {
        addToast({
          type: 'error',
          title: 'Fehler',
          message: 'Bitte geben Sie Ihren 360dialog API-Key ein.',
        });
        return;
      }
      credentials = creds.apiKey;
    } else if (bspId === 'twilio') {
      const creds = bspCredentials['twilio'];
      if (!creds?.accountSid || !creds?.authToken || !creds.accountSid.trim() || !creds.authToken.trim()) {
        addToast({
          type: 'error',
          title: 'Fehler',
          message: 'Bitte geben Sie Account SID und Auth Token ein.',
        });
        return;
      }
      // Encode as base64 JSON (browser-compatible)
      const jsonString = JSON.stringify({ accountSid: creds.accountSid, authToken: creds.authToken });
      credentials = btoa(jsonString); // Browser base64 encoding
    } else if (bspId === 'messagebird') {
      const creds = bspCredentials['messagebird'];
      if (!creds?.apiKey || !creds.apiKey.trim()) {
        addToast({
          type: 'error',
          title: 'Fehler',
          message: 'Bitte geben Sie Ihren MessageBird API-Key ein.',
        });
        return;
      }
      credentials = creds.apiKey;
    } else {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Unbekannter BSP.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Call callback endpoint to validate and save credentials
      const callbackUrl = `/api/auth/bsp/callback?code=${encodeURIComponent(credentials)}&botId=${bot.id}&bsp=${bspId}`;
      
      const response = await fetch(callbackUrl, {
        method: 'GET',
      });

      if (response.redirected) {
        // Success - redirect will be handled
        window.location.href = response.url;
      } else {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        // Manual redirect if needed
        window.location.href = `/${locale}/bots/${bot.id}?success=whatsapp_connected`;
      }
    } catch (error: any) {
      console.error('[BSP] Connection error:', error);
      addToast({
        type: 'error',
        title: 'Verbindung fehlgeschlagen',
        message: error.message || 'Die BSP-Verbindung konnte nicht hergestellt werden. Bitte überprüfen Sie Ihre Credentials.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (setupMethod === 'bsp' && !selectedBSP) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte wählen Sie einen BSP aus.',
      });
      return;
    }

    if (setupMethod === 'meta-direct' && (!phoneNumberId || !accessToken)) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Phone Number ID und Access Token sind erforderlich.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bots')
        .update({
          whatsapp_business_id: phoneNumberId || selectedBSP,
          bot_config: {
            ...bot.bot_config,
            whatsapp: {
              provider: setupMethod === 'bsp' ? selectedBSP : 'meta-direct',
              phone_number_id: phoneNumberId,
              access_token: accessToken,
              verify_token: verifyToken,
              webhook_url: `${window.location.origin}/api/webhooks/whatsapp`,
            },
          },
        })
        .eq('id', bot.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Erfolg',
        message: 'WhatsApp API erfolgreich konfiguriert!',
      });

      if (onComplete) onComplete();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Konfiguration konnte nicht gespeichert werden.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show Inhouse Wizard if selected
  if (showInhouseWizard && userId) {
    return (
      <WhatsAppInhouseSetupWizard
        bot={bot}
        userId={userId}
        onComplete={() => {
          setShowInhouseWizard(false);
          onComplete?.();
        }}
        onClose={() => {
          setShowInhouseWizard(false);
          onClose?.();
        }}
      />
    );
  }

  const renderStepContent = () => {
    // Step 1: Choose Setup Method
    if (currentStep === 0) {
      return (
        <div className="space-y-6">
          {/* Inhouse Setup Option - NEW and RECOMMENDED */}
          <div className="bg-green-50 border-2 border-brand-green rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-green-900">🚀 Inhouse-Setup (Empfohlen)</h3>
                <span className="px-2 py-1 bg-brand-green text-white text-xs rounded-full font-semibold">
                  NEU
                </span>
              </div>
            </div>
            <p className="text-sm text-green-800 mb-3">
              Direkte Integration mit Meta/Facebook Business Manager - <strong>Setup-Zeit: 5-10 Minuten!</strong>
            </p>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside mb-4">
              <li>✅ Direkte Meta-Integration (kein BSP nötig)</li>
              <li>✅ Keine BSP-Gebühren</li>
              <li>✅ Phone Verification KOSTENLOS</li>
              <li>✅ Volle Kontrolle über Daten</li>
              <li>✅ DSGVO-konform</li>
            </ul>
            <Button
              variant="primary"
              onClick={() => {
                if (userId) {
                  setShowInhouseWizard(true);
                } else {
                  addToast({
                    type: 'error',
                    title: 'Fehler',
                    message: 'Benutzer-ID nicht gefunden. Bitte laden Sie die Seite neu.',
                  });
                }
              }}
              className="w-full"
            >
              Inhouse-Setup starten
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Alternative: BSP-Integration</h3>
            <p className="text-sm text-blue-800 mb-3">
              Business Solution Provider (BSPs) wie 360dialog übernehmen die komplizierte Meta-Verifizierung für Sie.
              <strong> Setup-Zeit: 2-5 Minuten!</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>✅ Keine Meta Developer Account nötig</li>
            <li>✅ Keine Business-Verifizierung</li>
            <li>✅ Einfache API-Key-Eingabe</li>
            <li>✅ Sofort einsatzbereit</li>
            </ul>
          </div>

          {/* BSP Options */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 mb-3">BSP-Optionen:</h4>
            {BSP_PROVIDERS.map((bsp) => (
              <div
                key={bsp.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  setupMethod === 'bsp' && selectedBSP === bsp.id
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSetupMethod('bsp');
                  setSelectedBSP(bsp.id);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{bsp.logo}</span>
                      <h5 className="font-semibold text-gray-900">{bsp.name}</h5>
                      {bsp.id === '360dialog' && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                          Empfohlen
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{bsp.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span>⏱️ {bsp.setupTime}</span>
                      {bsp.euDataResidency && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                          ✅ EU-Datenhaltung
                        </span>
                      )}
                      <a href={bsp.website} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">
                        Website →
                      </a>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {bsp.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="ml-4">
                    <input
                      type="radio"
                      checked={setupMethod === 'bsp' && selectedBSP === bsp.id}
                      onChange={() => {
                        setSetupMethod('bsp');
                        setSelectedBSP(bsp.id);
                      }}
                      className="w-5 h-5 text-brand-green"
                    />
                  </div>
                </div>
                {setupMethod === 'bsp' && selectedBSP === bsp.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {/* DSGVO Consent Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-900 mb-2 text-sm">
                        📋 DSGVO-konforme Datenverarbeitung
                      </h5>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`gdpr-consent-${bsp.id}`}
                            checked={gdprConsent}
                            onChange={(e) => setGdprConsent(e.target.checked)}
                            className="mt-1"
                            required
                          />
                          <label htmlFor={`gdpr-consent-${bsp.id}`} className="text-xs text-blue-800">
                            <strong>Zustimmung zur Datenweitergabe:</strong> Ich stimme zu, dass zur Bereitstellung des WhatsApp Business API Service folgende Daten an {bsp.name} (Business Solution Provider) übertragen werden:
                            <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                              <li>Bot-Konfiguration (Flow-Daten, keine personenbezogenen Kundendaten)</li>
                              <li>OAuth-Zugangsdaten (verschlüsselt)</li>
                              <li>Webhook-Konfiguration</li>
                            </ul>
                            <span className="text-blue-700 font-semibold">Diese Daten werden nur für den Betrieb des WhatsApp Business API Service verwendet.</span>
                          </label>
                        </div>
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`gdpr-dpa-${bsp.id}`}
                            checked={gdprDataProcessing}
                            onChange={(e) => setGdprDataProcessing(e.target.checked)}
                            className="mt-1"
                            required
                          />
                          <label htmlFor={`gdpr-dpa-${bsp.id}`} className="text-xs text-blue-800">
                            <strong>Auftragsverarbeitungsvertrag (AVV):</strong> Ich bestätige, dass {bsp.name === '360dialog' ? '360dialog (EU-basiert, GDPR-konform)' : bsp.name === 'Twilio' ? 'Twilio (mit EU-Data-Residency)' : bsp.name} als Auftragsverarbeiter gemäß Art. 28 DSGVO agiert und einen entsprechenden Vertrag bereitstellt.
                            {bsp.id === '360dialog' && (
                              <span className="block mt-1 text-green-700 font-semibold">
                                ✅ 360dialog speichert Daten in der EU (DSGVO-konform)
                              </span>
                            )}
                          </label>
                        </div>
                        <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                          <strong>Wichtig:</strong> Personenbezogene Daten Ihrer WhatsApp-Kunden (Telefonnummern, Nachrichten) werden <strong>NICHT</strong> an den BSP übertragen. Diese bleiben in Ihrer Kontrolle und werden direkt zwischen WhatsApp und Ihrem Bot verarbeitet.
                        </div>
                        <div className="text-xs text-blue-600">
                          <a href="/legal/privacy" target="_blank" className="underline hover:text-blue-800">
                            Datenschutzerklärung
                          </a>
                          {' · '}
                          <a href="/legal/data-processing" target="_blank" className="underline hover:text-blue-800">
                            Auftragsverarbeitung (AVV)
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* API Key / Credentials Input Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-900 text-sm">
                          🔑 API-Credentials eingeben
                        </h5>
                        <button
                          type="button"
                          onClick={() => setShowBSPInstructions(showBSPInstructions === bsp.id ? null : bsp.id)}
                          className="text-xs text-brand-green hover:underline"
                        >
                          {showBSPInstructions === bsp.id ? 'Anleitung ausblenden' : '📖 Anleitung anzeigen'}
                        </button>
                      </div>

                      {/* Instructions for each BSP */}
                      {showBSPInstructions === bsp.id && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          {bsp.id === '360dialog' && (
                            <div className="space-y-3 text-sm text-blue-900">
                              <h6 className="font-semibold">📋 So erhalten Sie Ihren 360dialog API-Key:</h6>
                              <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Besuchen Sie <a href="https://dashboard.360dialog.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">360dialog Dashboard</a></li>
                                <li>Erstellen Sie ein kostenloses Konto (falls noch nicht vorhanden)</li>
                                <li>Melden Sie sich an und gehen Sie zu <strong>"API Keys"</strong> oder <strong>"Settings"</strong></li>
                                <li>Klicken Sie auf <strong>"Create API Key"</strong> oder kopieren Sie den vorhandenen API-Key</li>
                                <li>Der API-Key hat das Format: <code className="bg-blue-100 px-1 rounded">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code> (UUID Format)</li>
                                <li>Kopieren Sie den API-Key und fügen Sie ihn unten ein</li>
                              </ol>
                              <div className="bg-blue-100 p-2 rounded mt-2">
                                <strong>💡 Tipp:</strong> Sie können auch einen Test-API-Key erstellen, um die Integration zu testen.
                              </div>
                              <div className="text-xs text-blue-700 mt-2">
                                <a href="https://docs.360dialog.com" target="_blank" rel="noopener noreferrer" className="underline">
                                  📚 Vollständige Dokumentation →
                                </a>
                              </div>
                            </div>
                          )}

                          {bsp.id === 'twilio' && (
                            <div className="space-y-3 text-sm text-blue-900">
                              <h6 className="font-semibold">📋 So erhalten Sie Ihre Twilio Credentials:</h6>
                              <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Besuchen Sie <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Twilio Console</a></li>
                                <li>Erstellen Sie ein kostenloses Konto (falls noch nicht vorhanden) - Sie erhalten $15 Testguthaben</li>
                                <li>Melden Sie sich an und gehen Sie zum <strong>Dashboard</strong></li>
                                <li>Sie finden Ihre <strong>Account SID</strong> und <strong>Auth Token</strong> auf der Dashboard-Hauptseite</li>
                                <li><strong>Account SID:</strong> Beginnt mit <code className="bg-blue-100 px-1 rounded">AC...</code></li>
                                <li><strong>Auth Token:</strong> Wird als geheimer Token angezeigt (klicken Sie auf "Show" um ihn zu sehen)</li>
                                <li>Kopieren Sie beide Werte und fügen Sie sie unten ein</li>
                              </ol>
                              <div className="bg-blue-100 p-2 rounded mt-2">
                                <strong>⚠️ Wichtig:</strong> Bewahren Sie Ihre Auth Token sicher auf. Sie werden nur einmal angezeigt!
                              </div>
                              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mt-2">
                                <strong>📱 WhatsApp Setup in Twilio:</strong>
                                <ol className="list-decimal list-inside space-y-1 mt-1 ml-2 text-xs">
                                  <li>Gehen Sie zu <strong>Messaging → Try it out → Send a WhatsApp message</strong></li>
                                  <li>Folgen Sie der Anleitung, um WhatsApp für Ihr Konto zu aktivieren</li>
                                  <li>Sie erhalten eine WhatsApp-Sender-Nummer (z.B. +1 234 567 8900)</li>
                                </ol>
                              </div>
                              <div className="text-xs text-blue-700 mt-2">
                                <a href="https://www.twilio.com/docs/whatsapp" target="_blank" rel="noopener noreferrer" className="underline">
                                  📚 Twilio WhatsApp Dokumentation →
                                </a>
                              </div>
                            </div>
                          )}

                          {bsp.id === 'messagebird' && (
                            <div className="space-y-3 text-sm text-blue-900">
                              <h6 className="font-semibold">📋 So erhalten Sie Ihren MessageBird API-Key:</h6>
                              <ol className="list-decimal list-inside space-y-2 ml-2">
                                <li>Besuchen Sie <a href="https://dashboard.messagebird.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">MessageBird Dashboard</a></li>
                                <li>Erstellen Sie ein kostenloses Konto (falls noch nicht vorhanden)</li>
                                <li>Melden Sie sich an und gehen Sie zu <strong>"Settings" → "API Access"</strong></li>
                                <li>Klicken Sie auf <strong>"Generate API Key"</strong> oder kopieren Sie den vorhandenen API-Key</li>
                                <li>Der API-Key ist ein langer alphanumerischer String</li>
                                <li>Kopieren Sie den API-Key und fügen Sie ihn unten ein</li>
                              </ol>
                              <div className="bg-blue-100 p-2 rounded mt-2">
                                <strong>💡 Tipp:</strong> MessageBird bietet auch eine kostenlose Testphase. Für WhatsApp benötigen Sie einen Business-Account.
                              </div>
                              <div className="text-xs text-blue-700 mt-2">
                                <a href="https://developers.messagebird.com" target="_blank" rel="noopener noreferrer" className="underline">
                                  📚 MessageBird Dokumentation →
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Input Fields based on BSP */}
                      {bsp.id === '360dialog' && (
                        <div>
                          <label htmlFor={`360dialog-api-key`} className="block text-sm font-medium text-gray-700 mb-1">
                            360dialog API-Key <span className="text-red-500">*</span>
                            <HelpIconInline
                              title="360dialog API-Key"
                              content="Ihr 360dialog API-Key ist ein eindeutiger Identifikator für Ihr Konto. Sie finden ihn im 360dialog Dashboard unter 'API Keys' oder 'Settings'. Der Key hat das Format einer UUID (z.B. 12345678-1234-1234-1234-123456789abc)."
                              docLink={`/${locale}/docs#bsp-360dialog`}
                            />
                          </label>
                          <input
                            id={`360dialog-api-key`}
                            type="text"
                            value={bspCredentials['360dialog']?.apiKey || ''}
                            onChange={(e) => setBspCredentials({
                              ...bspCredentials,
                              '360dialog': { apiKey: e.target.value },
                            })}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent font-mono text-sm"
                            disabled={isSaving}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Format: UUID (z.B. 12345678-1234-1234-1234-123456789abc)
                          </p>
                        </div>
                      )}

                      {bsp.id === 'twilio' && (
                        <div className="space-y-3">
                          <div>
                            <label htmlFor={`twilio-account-sid`} className="block text-sm font-medium text-gray-700 mb-1">
                              Twilio Account SID <span className="text-red-500">*</span>
                              <HelpIconInline
                                title="Twilio Account SID"
                                content="Die Account SID ist Ihre eindeutige Twilio-Kontonummer. Sie finden sie auf der Hauptseite Ihres Twilio Dashboards. Die SID beginnt immer mit 'AC' gefolgt von 32 alphanumerischen Zeichen."
                                docLink={`/${locale}/docs#bsp-twilio`}
                              />
                            </label>
                            <input
                              id={`twilio-account-sid`}
                              type="text"
                              value={bspCredentials['twilio']?.accountSid || ''}
                              onChange={(e) => setBspCredentials({
                                ...bspCredentials,
                                'twilio': {
                                  accountSid: e.target.value,
                                  authToken: bspCredentials['twilio']?.authToken || '',
                                },
                              })}
                              placeholder="AC_SAMPLE_SID"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent font-mono text-sm"
                              disabled={isSaving}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Beginnt mit "AC" (Beispiel: AC_SAMPLE_SID)
                            </p>
                          </div>
                          <div>
                            <label htmlFor={`twilio-auth-token`} className="block text-sm font-medium text-gray-700 mb-1">
                              Twilio Auth Token <span className="text-red-500">*</span>
                              <HelpIconInline
                                title="Twilio Auth Token"
                                content="Der Auth Token ist Ihr geheimes Passwort für die Twilio API. Sie finden ihn im Twilio Dashboard neben der Account SID. WICHTIG: Der Token wird nur einmal angezeigt - kopieren Sie ihn sofort und bewahren Sie ihn sicher auf!"
                                docLink={`/${locale}/docs#bsp-twilio`}
                              />
                            </label>
                            <input
                              id={`twilio-auth-token`}
                              type="password"
                              value={bspCredentials['twilio']?.authToken || ''}
                              onChange={(e) => setBspCredentials({
                                ...bspCredentials,
                                'twilio': {
                                  accountSid: bspCredentials['twilio']?.accountSid || '',
                                  authToken: e.target.value,
                                },
                              })}
                              placeholder="Ihr geheimer Auth Token"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent font-mono text-sm"
                              disabled={isSaving}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Wird in der Twilio Console als geheimer Wert angezeigt
                            </p>
                          </div>
                        </div>
                      )}

                      {bsp.id === 'messagebird' && (
                        <div>
                          <label htmlFor={`messagebird-api-key`} className="block text-sm font-medium text-gray-700 mb-1">
                            MessageBird API-Key <span className="text-red-500">*</span>
                            <HelpIconInline
                              title="MessageBird API-Key"
                              content="Ihr MessageBird API-Key ermöglicht den Zugriff auf die MessageBird API. Sie finden ihn im MessageBird Dashboard unter 'Settings' → 'API Access'. Der Key ist ein langer alphanumerischer String (mindestens 20 Zeichen)."
                              docLink={`/${locale}/docs#bsp-messagebird`}
                            />
                          </label>
                          <input
                            id={`messagebird-api-key`}
                            type="password"
                            value={bspCredentials['messagebird']?.apiKey || ''}
                            onChange={(e) => setBspCredentials({
                              ...bspCredentials,
                              'messagebird': { apiKey: e.target.value },
                            })}
                            placeholder="Ihr MessageBird API-Key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent font-mono text-sm"
                            disabled={isSaving}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Alphanumerischer String (mindestens 20 Zeichen)
                          </p>
                        </div>
                      )}

                      <Button
                        variant="primary"
                        onClick={() => handleBSPConnect(bsp.id)}
                        className="w-full"
                        disabled={!gdprConsent || !gdprDataProcessing || isSaving}
                        isLoading={isSaving}
                      >
                        {isSaving ? 'Verbinde...' : `Mit ${bsp.name} verbinden`}
                      </Button>
                      {(!gdprConsent || !gdprDataProcessing) && (
                        <p className="text-xs text-red-600 text-center">
                          Bitte stimmen Sie den DSGVO-Bedingungen zu
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Alternative: Meta Direct */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                setupMethod === 'meta-direct'
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSetupMethod('meta-direct')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📱</span>
                    <h5 className="font-semibold text-gray-900">Direkt mit Meta (Erweitert)</h5>
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                      Nur für Experten
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Direkter Setup mit Meta Developer Account (2-3 Wochen Verifizierung)
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>⚠️ Meta Developer Account erforderlich</li>
                    <li>⚠️ Business-Verifizierung nötig (2-3 Wochen)</li>
                    <li>⚠️ Manuelle API-Konfiguration</li>
                    <li>⚠️ Komplexer Setup-Prozess</li>
                  </ul>
                </div>
                <div className="ml-4">
                  <input
                    type="radio"
                    checked={setupMethod === 'meta-direct'}
                    onChange={() => setSetupMethod('meta-direct')}
                    className="w-5 h-5 text-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Step 2: Meta Direct Setup (only if selected)
    if (currentStep === 1 && setupMethod === 'meta-direct') {
      return (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">⚠️ Meta Direct Setup</h3>
            <p className="text-sm text-amber-800 mb-3">
              Dieser Prozess erfordert einen Meta Developer Account und Business-Verifizierung (2-3 Wochen).
              Wir empfehlen stattdessen einen BSP wie 360dialog zu verwenden.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentStep(0);
                setSetupMethod(null);
              }}
            >
              ← Zurück zu BSP-Optionen
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-4">Meta API Credentials</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="z.B. 123456789012345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Temporary oder Permanent Token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verify Token (auto-generiert)
                </label>
                <input
                  type="text"
                  value={verifyToken}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Step 2: BSP Success (if OAuth completed)
    if (currentStep === 1 && setupMethod === 'bsp') {
      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="font-semibold text-green-900 mb-2">Verbindung erfolgreich!</h3>
            <p className="text-sm text-green-800">
              Ihr Bot ist jetzt mit {BSP_PROVIDERS.find(p => p.id === selectedBSP)?.name} verbunden.
            </p>
          </div>
        </div>
      );
    }
    
    // Fallback: Return null if no step matches
    return null;
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return setupMethod !== null && (setupMethod === 'bsp' ? selectedBSP !== null : true);
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (currentStep === 0) {
      if (setupMethod === 'bsp') {
        // BSP OAuth will handle the redirect
        // This step will be shown after OAuth callback
        setCurrentStep(1);
      } else {
        // Meta direct: show credentials form
        setCurrentStep(1);
      }
    } else {
      handleSave();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = setupMethod === 'bsp' 
    ? ['Methode wählen', 'Verbindung bestätigen']
    : ['Methode wählen', 'Credentials eingeben'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                WhatsApp Business API Setup
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Schritt {currentStep + 1} von {steps.length}
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
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 rounded ${
                    index <= currentStep
                      ? 'bg-brand-green'
                      : 'bg-gray-200'
                  }`}
                />
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
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Zurück
          </Button>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
            )}
            {setupMethod !== 'bsp' || currentStep === 0 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canProceed() || isSaving}
                isLoading={isSaving}
              >
                {currentStep === steps.length - 1 ? 'Speichern & Fertig' : 'Weiter'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
