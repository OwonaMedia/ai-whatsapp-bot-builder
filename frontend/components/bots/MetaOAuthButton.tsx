'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface MetaOAuthButtonProps {
  botId: string;
  userId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function MetaOAuthButton({ botId, userId, onSuccess, onError }: MetaOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);

    try {
      // Build OAuth URL
      const appId = process.env.NEXT_PUBLIC_META_APP_ID;
      if (!appId) {
        throw new Error('Meta App ID not configured');
      }

      const redirectUri = `${window.location.origin}/api/whatsapp/meta/oauth`;
      const scopes = [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management',
      ].join(',');

      // Create state with botId and userId
      const state = encodeURIComponent(
        JSON.stringify({
          botId,
          userId,
          timestamp: Date.now(),
        })
      );

      const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;

      // Redirect to Meta OAuth
      window.location.href = oauthUrl;
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate OAuth';
      addToast({
        type: 'error',
        title: 'OAuth Error',
        message: errorMessage,
      });
      onError?.(errorMessage);
    }
  };

  return (
    <Button
      variant="primary"
      onClick={handleConnect}
      isLoading={isLoading}
      className="w-full"
    >
      {isLoading ? 'Verbinde...' : 'Mit Facebook Business Manager verbinden'}
    </Button>
  );
}

