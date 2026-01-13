'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

type CookiePreferences = {
  necessary: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export default function CookieBanner() {
  const pathname = usePathname();
  // Extract locale from pathname (e.g., /de/legal/cookies -> de, / -> default to de)
  const locale = pathname?.split('/')[1] || 'de';
  const basePath = locale && ['de', 'en', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(locale) ? `/${locale}` : '';
  
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent was already given
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
        applyCookiePreferences(saved);
      } catch (e) {
        // Invalid consent data, show banner again
        setShowBanner(true);
      }
    }
  }, []);

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Necessary cookies are always set
    // Functional cookies
    if (prefs.functional) {
      // Set functional cookies here if needed
      console.log('[CookieBanner] Functional cookies enabled');
    } else {
      // Remove functional cookies
      console.log('[CookieBanner] Functional cookies disabled');
    }

    // Analytics cookies
    if (prefs.analytics) {
      // Set analytics cookies here if needed
      console.log('[CookieBanner] Analytics cookies enabled');
    } else {
      // Remove analytics cookies
      console.log('[CookieBanner] Analytics cookies disabled');
    }

    // Marketing cookies
    if (prefs.marketing) {
      // Set marketing cookies here if needed
      console.log('[CookieBanner] Marketing cookies enabled');
    } else {
      // Remove marketing cookies
      console.log('[CookieBanner] Marketing cookies disabled');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('cookie_consent', JSON.stringify(allAccepted));
    localStorage.setItem('cookie_consent_timestamp', new Date().toISOString());
    applyCookiePreferences(allAccepted);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptNecessary = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(onlyNecessary);
    localStorage.setItem('cookie_consent', JSON.stringify(onlyNecessary));
    localStorage.setItem('cookie_consent_timestamp', new Date().toISOString());
    applyCookiePreferences(onlyNecessary);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(preferences));
    localStorage.setItem('cookie_consent_timestamp', new Date().toISOString());
    applyCookiePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleRevokeConsent = () => {
    localStorage.removeItem('cookie_consent');
    localStorage.removeItem('cookie_consent_timestamp');
    setShowBanner(true);
    setShowSettings(false);
    // Remove all cookies except necessary
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    applyCookiePreferences(onlyNecessary);
  };

  if (!showBanner) {
    // Show small banner at bottom right to reopen settings
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        >
          🍪 Cookie-Einstellungen
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {!showSettings ? (
            // Simple Banner View
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">🍪 Cookie-Einstellungen</h3>
                <p className="text-sm text-gray-600">
                  Wir verwenden Cookies, um unsere Website zu optimieren und Ihnen die bestmögliche Erfahrung zu bieten. 
                  Notwendige Cookies sind für die Funktionsfähigkeit erforderlich. 
                  Sie können Ihre Präferenzen jederzeit anpassen.{' '}
                  <Link href={`${basePath}/legal/cookies`} className="text-brand-green hover:underline">
                    Mehr erfahren
                  </Link>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  Einstellungen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAcceptNecessary}
                >
                  Nur notwendige
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptAll}
                >
                  Alle akzeptieren
                </Button>
              </div>
            </div>
          ) : (
            // Detailed Settings View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Cookie-Einstellungen</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {/* Necessary Cookies */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Notwendige Cookies
                      </h4>
                      <p className="text-gray-600 text-xs mb-2">
                        Diese Cookies sind für das Funktionieren der Website unbedingt erforderlich (z.B. Anmeldedaten, Sprachauswahl).
                      </p>
                      <p className="text-xs text-gray-500">
                        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.necessary}
                      disabled
                      className="ml-4 mt-1"
                    />
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Funktionale Cookies
                      </h4>
                      <p className="text-gray-600 text-xs mb-2">
                        Diese Cookies ermöglichen erweiterte Funktionalität (z.B. Bot-Builder-Zustand speichern).
                      </p>
                      <p className="text-xs text-gray-500">
                        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) =>
                        setPreferences({ ...preferences, functional: e.target.checked })
                      }
                      className="ml-4 mt-1"
                    />
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Analyse-Cookies
                      </h4>
                      <p className="text-gray-600 text-xs mb-2">
                        Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren (derzeit nicht aktiv).
                      </p>
                      <p className="text-xs text-gray-500">
                        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      disabled // Currently not used
                      className="ml-4 mt-1 opacity-50"
                    />
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Marketing-Cookies
                      </h4>
                      <p className="text-gray-600 text-xs mb-2">
                        Diese Cookies werden für Marketingzwecke verwendet (derzeit nicht aktiv).
                      </p>
                      <p className="text-xs text-gray-500">
                        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                      disabled // Currently not used
                      className="ml-4 mt-1 opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeConsent}
                >
                  Einwilligung widerrufen
                </Button>
                <div className="flex-1" />
                <Link href={`${basePath}/legal/cookies`} className="text-sm text-gray-600 hover:text-gray-900 self-center">
                  Cookie-Richtlinie
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSavePreferences}
                >
                  Einstellungen speichern
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

