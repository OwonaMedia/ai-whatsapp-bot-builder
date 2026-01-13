import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useFacebookLogin } from '@/hooks/useFacebookLogin';
import { FacebookLoginButton } from '@/components/auth/FacebookLoginButton';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase';

interface WhatsAppConnectorProps {
  onConnected?: (connection: any) => void;
  className?: string;
}

export const WhatsAppConnector = ({ onConnected, className = '' }: WhatsAppConnectorProps) => {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const handleWhatsAppConnect = async (facebookResult: any) => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');

      // Supabase Client
      const supabase = createClient();

      // Speichere WhatsApp Connection
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          phone_number_id: facebookResult.phoneNumberId || 'pending',
          access_token: facebookResult.accessToken,
          business_account_id: facebookResult.businessAccountId || 'pending',
          phone_number: null, // Wird später von Meta API geholt
          status: 'active',
          connected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error('Fehler beim Speichern der WhatsApp-Verbindung');
      }

      setConnectionStatus('connected');

      addToast({
        type: 'success',
        title: 'WhatsApp verbunden!',
        message: 'Ihre WhatsApp Business Nummer wurde erfolgreich verbunden.',
        duration: 5000,
      });

      onConnected?.(data);

      // Redirect to dashboard
      router.push(`/${locale}/dashboard`);

    } catch (error: any) {
      console.error('WhatsApp connection error:', error);
      setConnectionStatus('disconnected');

      addToast({
        type: 'error',
        title: 'Verbindungsfehler',
        message: error.message || 'WhatsApp konnte nicht verbunden werden.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <span className="text-2xl">📱</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          WhatsApp Business verbinden
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Verbinden Sie Ihre WhatsApp Business Nummer mit einem Klick.
          Keine technischen Einstellungen erforderlich.
        </p>
      </div>

      <div className="space-y-4">
        {connectionStatus === 'connected' ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h4 className="text-lg font-semibold text-green-800 mb-2">
              WhatsApp verbunden!
            </h4>
            <p className="text-sm text-green-600">
              Ihre WhatsApp Business Nummer ist bereit für den Bot-Einsatz.
            </p>
          </div>
        ) : (
          <>
            <FacebookLoginButton
              variant="whatsapp"
              onSuccess={handleWhatsAppConnect}
              onError={(error) => {
                addToast({
                  type: 'error',
                  title: 'Verbindungsfehler',
                  message: error.message,
                });
              }}
              className="w-full"
            />

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">
                Durch die Verbindung akzeptieren Sie die
              </p>
              <a
                href="#"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                WhatsApp Business API Nutzungsbedingungen
              </a>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-400">ℹ️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Wie funktioniert die Verbindung?
                  </h4>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Facebook Login Pop-up öffnet sich</li>
                      <li>Wählen Sie Ihren Business Account</li>
                      <li>Wählen Sie Ihre WhatsApp Nummer</li>
                      <li>Klicken Sie auf "Zulassen"</li>
                      <li>Fertig! Ihr Bot kann loslegen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
