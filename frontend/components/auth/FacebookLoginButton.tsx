import { useState } from 'react';
import { useFacebookLogin } from '@/hooks/useFacebookLogin';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';

interface FacebookLoginButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  variant?: 'register' | 'login' | 'whatsapp';
  className?: string;
  useServerFlow?: boolean; // Neu: Option für Server-Side Flow (besser für Mobile)
}

export const FacebookLoginButton = ({
  onSuccess,
  onError,
  variant = 'login',
  className = '',
  useServerFlow = true, // Default auf true für bessere Mobile-Kompatibilität
}: FacebookLoginButtonProps) => {
  const { login, loginWithWhatsApp, isLoaded, isLoading } = useFacebookLogin();
  const [isProcessing, setIsProcessing] = useState(false);
  const params = useParams();
  const locale = (params?.locale as string) || 'de';

  const handleFacebookLogin = async () => {
    // Server-Side Flow (empfohlen für Mobile/Safari)
    if (useServerFlow && variant !== 'whatsapp') {
      const type = variant === 'register' ? 'signup' : 'login';
      window.location.href = `/api/auth/facebook?locale=${locale}&type=${type}`;
      return;
    }

    // Client-Side Flow (SDK Popup - nur für WhatsApp oder wenn explizit gewünscht)
    try {
      setIsProcessing(true);

      let result;
      if (variant === 'whatsapp') {
        result = await loginWithWhatsApp();
      } else {
        const scopes = variant === 'register'
          ? ['email', 'public_profile']
          : ['email'];
        result = await login(scopes);
      }

      onSuccess?.(result);
    } catch (error) {
      console.error('Facebook login failed:', error);
      onError?.(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing || isLoading) return 'Verbinde...';

    switch (variant) {
      case 'register':
        return 'Mit Facebook registrieren';
      case 'whatsapp':
        return 'WhatsApp Business verbinden';
      default:
        return 'Mit Facebook anmelden';
    }
  };

  const getButtonIcon = () => {
    switch (variant) {
      case 'whatsapp':
        return '📱';
      default:
        return 'f';
    }
  };

  const getButtonColor = () => {
    switch (variant) {
      case 'whatsapp':
        return 'bg-green-600 hover:bg-green-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      disabled={(!isLoaded && !useServerFlow) || isProcessing}
      className={`${getButtonColor()} text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 ${className}`}
    >
      <span className="text-lg">{getButtonIcon()}</span>
      {getButtonText()}
    </Button>
  );
};
