"use client";

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';
import { useFacebookLogin } from '@/hooks/useFacebookLogin';
import { Facebook, CheckCircle, Link as LinkIcon } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { addToast } = useToast();
  const { login: facebookLogin, isLoaded: isFacebookLoaded } = useFacebookLogin();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push(`/${locale}/auth/login?redirect=/${locale}/settings`);
          return;
        }

        setUser(user);
        setFormData({
          email: user.email || '',
          fullName: user.user_metadata?.full_name || '',
        });
        
        // Check if Facebook is connected
        const hasFacebookProvider = user.app_metadata?.providers?.includes('facebook') || 
                                    user.identities?.some((identity: any) => identity.provider === 'facebook');
        setFacebookConnected(hasFacebookProvider);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading user:', error);
        router.push(`/${locale}/auth/login`);
      }
    };

    loadUser();
  }, [locale, router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
        },
      });

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Erfolg',
        message: 'Einstellungen wurden gespeichert.',
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Einstellungen konnten nicht gespeichert werden.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectFacebook = async () => {
    if (!isFacebookLoaded) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Facebook SDK wird noch geladen. Bitte versuchen Sie es erneut.',
      });
      return;
    }

    setIsConnectingFacebook(true);
    try {
      const result = await facebookLogin();
      
      if (result.accessToken) {
        // Link Facebook account to existing user
        const supabase = createClient();
        const { error } = await supabase.auth.linkIdentity({
          provider: 'facebook',
          options: {
            redirectTo: `${window.location.origin}/${locale}/settings`,
          }
        });

        if (error) throw error;

        addToast({
          type: 'success',
          title: 'Erfolg',
          message: 'Facebook-Konto wurde erfolgreich verknüpft.',
        });
        setFacebookConnected(true);
      }
    } catch (error: any) {
      console.error('Facebook connect error:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Facebook-Verknüpfung fehlgeschlagen.',
      });
    } finally {
      setIsConnectingFacebook(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lädt...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Einstellungen</h1>
        </div>

        <div className="space-y-6">

          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profileinstellungen</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-gray-500">Die E-Mail-Adresse kann nicht geändert werden.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vollständiger Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                {isSaving ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
            </div>
          </div>

          {/* Facebook Connection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrationen</h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Facebook className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Facebook</p>
                  <p className="text-sm text-gray-600">
                    {facebookConnected ? 'Verbunden' : 'Nicht verbunden'}
                  </p>
                </div>
              </div>
              
              {facebookConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Verbunden</span>
                </div>
              ) : (
                <Button
                  onClick={handleConnectFacebook}
                  disabled={isConnectingFacebook || !isFacebookLoaded}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isConnectingFacebook ? 'Wird verbunden...' : 'Verbinden'}
                </Button>
              )}
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sicherheit</h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Ihr Konto ist durch ein sicheres Passwort geschützt. Kontaktieren Sie den Support, wenn Sie Ihr Passwort ändern möchten.
              </p>
              <Button
                onClick={() => addToast({
                  type: 'info',
                  title: 'Info',
                  message: 'Passwortänderung wird in Kürze verfügbar sein.',
                })}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Passwort ändern
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
