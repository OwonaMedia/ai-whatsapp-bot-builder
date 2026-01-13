import pino from 'pino';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(level: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info') {
  return pino({
    level,
    base: {
      service: 'support-mcp-server',
    },
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;

/**
 * Loggt mit Kontext (ticketId, patternId, etc.)
 * Wrapper für strukturiertes Logging
 */
export function logWithContext(
  logger: Logger,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context: {
    ticketId?: string;
    patternId?: string;
    component?: string;
    duration?: number;
    error?: Error;
    metadata?: Record<string, unknown>;
  }
): void {
  const logData: Record<string, unknown> = {
    msg: message,
    ...context.metadata,
  };
  
  if (context.ticketId) {
    logData.ticketId = context.ticketId;
  }
  
  if (context.patternId) {
    logData.patternId = context.patternId;
  }
  
  if (context.component) {
    logData.component = context.component;
  }
  
  if (context.duration !== undefined) {
    logData.duration = context.duration;
  }
  
  if (context.error) {
    logData.err = {
      message: context.error.message,
      stack: context.error.stack,
      name: context.error.name,
    };
  }
  
  logger[level](logData);
}

