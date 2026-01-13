import { randomUUID } from 'crypto';
import pino, { Logger, LoggerOptions } from 'pino';

const GLOBAL_LOGGER_KEY = Symbol.for('whatsapp.owona.logger');

type GlobalWithLogger = typeof globalThis & {
  [GLOBAL_LOGGER_KEY]?: Logger;
};

function createBaseLogger(): Logger {
  const options: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    base: {
      application: 'whatsapp.owona.de',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  return pino(options);
}

function getBaseLogger(): Logger {
  const globalWithLogger = globalThis as GlobalWithLogger;
  if (!globalWithLogger[GLOBAL_LOGGER_KEY]) {
    globalWithLogger[GLOBAL_LOGGER_KEY] = createBaseLogger();
  }
  return globalWithLogger[GLOBAL_LOGGER_KEY] as Logger;
}

export function getLogger(): Logger {
  return getBaseLogger();
}

interface CreateRequestLoggerOptions {
  component?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export function createRequestLogger(options: CreateRequestLoggerOptions = {}): {
  requestId: string;
  logger: Logger;
} {
  const requestId = options.requestId ?? randomUUID();
  const child = getBaseLogger().child({
    requestId,
    component: options.component ?? 'app',
    ...options.metadata,
  });

  return {
    requestId,
    logger: child,
  };
}


