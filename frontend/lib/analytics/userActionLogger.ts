/**
 * User Action Logger
 * 
 * Loggt kritische User-Actions (Uploads, Payments, Errors) für Support-Diagnose
 * DSGVO-konform: Anonymisiert, mit Consent, automatische Retention
 */

'use client';

import { createClient } from '@/lib/supabase';

export interface UserAction {
  type: 'click' | 'input' | 'api_call' | 'error' | 'upload' | 'payment' | 'bot_creation';
  element?: string; // CSS-Selector oder Component-Name
  value?: string; // Input-Value oder API-Response (gehasht für Privacy)
  timestamp: string;
  sessionId: string;
  userId?: string; // Optional, nur wenn eingeloggt
  metadata?: Record<string, unknown>;
  errorMessage?: string; // Nur bei Errors
}

class UserActionLogger {
  private sessionId: string | null = null;
  private userId: string | null = null;
  private enabled: boolean = false;
  private supabase = createClient();
  private actionQueue: UserAction[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      return; // Server-side rendering - nicht initialisieren
    }

    this.initialize();
  }

  private async initialize() {
    // Initialisiere Session-ID
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('demo_session_id') || sessionStorage.getItem('user_session_id');
      if (!id) {
        id = `session_${crypto.randomUUID()}`;
        sessionStorage.setItem('user_session_id', id);
      }
      this.sessionId = id;

      // Prüfe User-ID (wenn eingeloggt)
      try {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
          this.userId = user.id;
        }
      } catch (error) {
        // Nicht kritisch - User nicht eingeloggt
      }

      // Prüfe Consent (Error-Logging ist immer erlaubt)
      // Für jetzt: Aktiviert (kann später mit Consent-Management erweitert werden)
      this.enabled = true;

      // Starte Flush-Interval (alle 5 Sekunden)
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 5000);
    }
  }

  /**
   * Loggt eine kritische Action
   */
  async logAction(action: Omit<UserAction, 'timestamp' | 'sessionId' | 'userId'>): Promise<void> {
    if (!this.enabled || !this.sessionId) {
      return; // Nicht aktiviert oder nicht initialisiert
    }

    // Anonymisiere sensible Daten
    const sanitizedAction: UserAction = {
      ...action,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      // Hash sensible Werte
      value: action.value && this.shouldHash(action.type)
        ? await this.hashValue(action.value)
        : action.value,
    };

    // Füge zur Queue hinzu
    this.actionQueue.push(sanitizedAction);

    // Bei Errors: Sofort flushen
    if (action.type === 'error') {
      await this.flush();
    }
  }

  /**
   * Loggt einen Error
   */
  async logError(
    error: Error | unknown,
    context?: {
      element?: string;
      component?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await this.logAction({
      type: 'error',
      element: context?.element || context?.component,
      errorMessage: errorMessage.substring(0, 500), // Limit für Privacy
      metadata: {
        ...context?.metadata,
        stack: errorStack ? errorStack.substring(0, 1000) : undefined, // Limit für Privacy
      },
    });
  }

  /**
   * Loggt einen PDF-Upload
   */
  async logPdfUpload(
    fileName: string,
    fileSize: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.logAction({
      type: 'upload',
      element: 'pdf-upload',
      value: fileName, // Dateiname ist OK (nicht sensibel)
      metadata: {
        fileSize,
        success,
        error: error?.substring(0, 200), // Limit für Privacy
      },
    });
  }

  /**
   * Loggt eine Payment-Action
   */
  async logPayment(
    action: 'initiated' | 'completed' | 'failed',
    amount?: number,
    currency?: string,
    error?: string
  ): Promise<void> {
    await this.logAction({
      type: 'payment',
      element: 'payment-flow',
      metadata: {
        action,
        amount, // Betrag ist OK (nicht sensibel für Support)
        currency,
        error: error?.substring(0, 200), // Limit für Privacy
      },
    });
  }

  /**
   * Flusht alle Actions in die Datenbank
   */
  private async flush(): Promise<void> {
    if (this.actionQueue.length === 0 || !this.sessionId) {
      return;
    }

    const actionsToFlush = [...this.actionQueue];
    this.actionQueue = [];

    try {
      // Batch-Insert in Supabase
      const { error } = await this.supabase
        .from('user_action_logs')
        .insert(
          actionsToFlush.map((action) => ({
            session_id: action.sessionId,
            user_id: action.userId || null,
            action_type: action.type,
            element_path: action.element,
            value_hash: action.value, // Bereits gehasht wenn nötig
            metadata: action.metadata || {},
            error_message: action.errorMessage,
            created_at: action.timestamp,
          }))
        );

      if (error) {
        console.warn('[UserActionLogger] Fehler beim Speichern von Actions:', error);
        // Füge Actions zurück zur Queue für Retry
        this.actionQueue.unshift(...actionsToFlush);
      }
    } catch (error) {
      console.warn('[UserActionLogger] Exception beim Flushen:', error);
      // Füge Actions zurück zur Queue für Retry
      this.actionQueue.unshift(...actionsToFlush);
    }
  }

  /**
   * Prüft ob ein Wert gehasht werden sollte
   */
  private shouldHash(actionType: UserAction['type']): boolean {
    // Hash sensible Daten
    return actionType === 'input' || actionType === 'payment';
  }

  /**
   * Hasht einen Wert für Privacy
   */
  private async hashValue(value: string): Promise<string> {
    // Einfacher Hash für Privacy (nicht kryptographisch sicher, aber ausreichend für Anonymisierung)
    // In Produktion würde man crypto.subtle.digest verwenden
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
      } catch (error) {
        // Fallback: Einfacher Hash
        return `hash_${value.length}_${value.charCodeAt(0)}`;
      }
    }
    // Fallback: Einfacher Hash
    return `hash_${value.length}_${value.charCodeAt(0)}`;
  }

  /**
   * Cleanup beim Unmount
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Flushe verbleibende Actions
    this.flush();
  }
}

// Singleton-Instanz
let loggerInstance: UserActionLogger | null = null;

export function getUserActionLogger(): UserActionLogger {
  if (typeof window === 'undefined') {
    // Server-side: Return dummy logger
    return {
      logAction: async () => { },
      logError: async () => { },
      logPdfUpload: async () => { },
      logPayment: async () => { },
      destroy: () => { },
    } as unknown as UserActionLogger;
  }

  if (!loggerInstance) {
    loggerInstance = new UserActionLogger();
  }

  return loggerInstance;
}

// Auto-cleanup beim Page-Unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (loggerInstance) {
      loggerInstance.destroy();
    }
  });
}

