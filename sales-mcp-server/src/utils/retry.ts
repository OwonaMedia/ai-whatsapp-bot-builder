/**
 * Retry-Utility mit Exponential Backoff und Jitter
 * Basierend auf Best Practices von AWS, Google SRE
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Führt eine Funktion mit Retry-Logik aus
 * Verwendet Exponential Backoff mit optionalem Jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (options.onRetry) {
        options.onRetry(attempt, lastError);
      }
      
      if (attempt === options.maxRetries) {
        throw lastError;
      }
      
      // Exponential Backoff
      const delay = Math.min(
        options.initialDelay * Math.pow(2, attempt),
        options.maxDelay
      );
      
      // Jitter hinzufügen (0-30% zufällige Variation)
      const jitter = options.jitter
        ? Math.random() * 0.3 * delay
        : 0;
      
      const finalDelay = delay + jitter;
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError ?? new Error('Unknown error in retry logic');
}

/**
 * Timeout-Wrapper für Promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage ?? `Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Kombiniert Retry mit Timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions,
  timeoutMs: number
): Promise<T> {
  return retryWithBackoff(
    () => withTimeout(fn(), timeoutMs),
    retryOptions
  );
}

