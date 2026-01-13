import { useEffect, useState } from 'react';

interface FacebookLoginResult {
  accessToken: string;
  userID: string;
  expiresIn?: number;
}

interface FacebookError {
  error: string;
  code?: string;
}

export const useFacebookLogin = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Facebook SDK laden
    const loadFacebookSDK = () => {
      if (window.FB) {
        setIsLoaded(true);
        return;
      }

      // SDK Script hinzufügen
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        window.fbAsyncInit = function() {
          window.FB?.init({
            appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
            cookie: true,
            xfbml: true,
            version: 'v18.0',
            // Fix für Safari/iOS: Redirect statt Popup verwenden
            autoLogAppEvents: true,
            status: true
          });
          setIsLoaded(true);
        };
      };

      document.head.appendChild(script);
    };

    loadFacebookSDK();
  }, []);

  const login = async (scopes: string[] = ['email']): Promise<FacebookLoginResult> => {
    return new Promise((resolve, reject) => {
      if (!isLoaded || !window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      setIsLoading(true);

      window.FB.login((response) => {
        setIsLoading(false);

        if (response.authResponse) {
          resolve({
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
            expiresIn: response.authResponse.expiresIn,
          });
        } else {
          reject(new Error('User cancelled login or login failed'));
        }
      }, {
        scope: scopes.join(','),
        return_scopes: true
      });
    });
  };

  const loginWithWhatsApp = async (): Promise<FacebookLoginResult & { phoneNumberId?: string; businessAccountId?: string }> => {
    return new Promise((resolve, reject) => {
      if (!isLoaded || !window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      setIsLoading(true);

      window.FB.login((response) => {
        setIsLoading(false);

        if (response.authResponse) {
          // Bei Embedded Signup kommen zusätzliche Daten
          const extendedResponse = response as any;
          resolve({
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
            expiresIn: response.authResponse.expiresIn,
            phoneNumberId: extendedResponse.phoneNumberId,
            businessAccountId: extendedResponse.businessAccountId,
          });
        } else {
          reject(new Error('User cancelled WhatsApp signup'));
        }
      }, {
        scope: 'whatsapp_business_management',
        return_scopes: true,
        config_id: process.env.NEXT_PUBLIC_FACEBOOK_EMBEDDED_CONFIG_ID
      });
    });
  };

  const logout = async (): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.FB) {
        resolve();
        return;
      }

      window.FB.logout(() => {
        resolve();
      });
    });
  };

  const getLoginStatus = async (): Promise<FacebookLoginResult | null> => {
    return new Promise((resolve) => {
      if (!window.FB) {
        resolve(null);
        return;
      }

      window.FB.getLoginStatus((response) => {
        if (response.authResponse) {
          resolve({
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
            expiresIn: response.authResponse.expiresIn,
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  return {
    login,
    loginWithWhatsApp,
    logout,
    getLoginStatus,
    isLoaded,
    isLoading,
  };
};
