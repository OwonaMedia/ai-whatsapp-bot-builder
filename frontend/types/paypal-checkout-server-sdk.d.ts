declare module '@paypal/checkout-server-sdk' {
  export interface PayPalEnvironment {
    clientId(): string;
    clientSecret(): string;
  }

  export class SandboxEnvironment implements PayPalEnvironment {
    constructor(clientId: string, clientSecret: string);
    clientId(): string;
    clientSecret(): string;
  }

  export class LiveEnvironment implements PayPalEnvironment {
    constructor(clientId: string, clientSecret: string);
    clientId(): string;
    clientSecret(): string;
  }

  export class PayPalHttpClient {
    constructor(environment: PayPalEnvironment);
    execute<T = any>(request: any): Promise<{ result: T; statusCode: number }>;
  }

  export namespace orders {
    export class OrdersCreateRequest {
      constructor();
      prefer(value: string): OrdersCreateRequest;
      requestBody(body: {
        intent: 'CAPTURE' | 'AUTHORIZE';
        purchase_units: Array<{
          amount: {
            currency_code: string;
            value: string;
          };
          description?: string;
        }>;
        application_context?: {
          return_url?: string;
          cancel_url?: string;
          brand_name?: string;
          user_action?: string;
        };
      }): OrdersCreateRequest;
      body: {
        intent: 'CAPTURE' | 'AUTHORIZE';
        purchase_units: Array<{
          amount: {
            currency_code: string;
            value: string;
          };
          description?: string;
        }>;
        application_context?: {
          return_url?: string;
          cancel_url?: string;
        };
      };
    }

    export class OrdersGetRequest {
      constructor(orderId: string);
      orderId: string;
    }

    export class OrdersCaptureRequest {
      constructor(orderId: string);
      requestBody(body: Record<string, any>): OrdersCaptureRequest;
      orderId: string;
    }
  }

  namespace paypal {
    namespace core {
      class PayPalHttpClient {
        constructor(environment: PayPalEnvironment);
        execute<T = any>(request: any): Promise<{ result: T; statusCode: number }>;
      }
      class SandboxEnvironment implements PayPalEnvironment {
        constructor(clientId: string, clientSecret: string);
        clientId(): string;
        clientSecret(): string;
      }
      class LiveEnvironment implements PayPalEnvironment {
        constructor(clientId: string, clientSecret: string);
        clientId(): string;
        clientSecret(): string;
      }
    }
    namespace orders {
      class OrdersCreateRequest {
        constructor();
        prefer(value: string): OrdersCreateRequest;
        requestBody(body: {
          intent: 'CAPTURE' | 'AUTHORIZE';
          purchase_units: Array<{
            amount: {
              currency_code: string;
              value: string;
            };
            description?: string;
          }>;
          application_context?: {
            return_url?: string;
            cancel_url?: string;
            brand_name?: string;
            user_action?: string;
          };
        }): OrdersCreateRequest;
        body: {
          intent: 'CAPTURE' | 'AUTHORIZE';
          purchase_units: Array<{
            amount: {
              currency_code: string;
              value: string;
            };
            description?: string;
          }>;
          application_context?: {
            return_url?: string;
            cancel_url?: string;
          };
        };
      }
      class OrdersGetRequest {
        constructor(orderId: string);
        orderId: string;
      }
      class OrdersCaptureRequest {
        constructor(orderId: string);
        requestBody(body: Record<string, any>): OrdersCaptureRequest;
        orderId: string;
      }
    }
  }

  const defaultExport: typeof paypal;
  export default defaultExport;
}

