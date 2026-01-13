// Facebook SDK TypeScript Definitions
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options?: FBLoginOptions
      ) => void;
      logout: (callback: (response: FBLoginResponse) => void) => void;
      getLoginStatus: (callback: (response: FBLoginResponse) => void) => void;
      api: (
        path: string,
        method: 'GET' | 'POST' | 'DELETE',
        params: Record<string, any>,
        callback: (response: any) => void
      ) => void;
    };
  }
}

export interface FBLoginResponse {
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
  status: 'connected' | 'not_authorized' | 'unknown';
}

export interface FBLoginOptions {
  scope?: string;
  return_scopes?: boolean;
  auth_type?: string;
  config_id?: string;
}

export interface FBWhatsAppSignupResponse extends FBLoginResponse {
  phoneNumberId?: string;
  businessAccountId?: string;
}
