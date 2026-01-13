const GLOBAL_OTEL_SDK_KEY = Symbol.for('whatsapp.owona.otel.sdk');

type GlobalWithOtel = typeof globalThis & {
  [GLOBAL_OTEL_SDK_KEY]?: {
    shutdown(): Promise<void>;
  };
};

function parseHeaders(rawHeaders: string | undefined): Record<string, string> | undefined {
  if (!rawHeaders) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  for (const segment of rawHeaders.split(',')) {
    const [key, value] = segment.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export async function register(): Promise<void> {
  // Skip OpenTelemetry in development mode to avoid build issues
  // Next.js still compiles this file, so we need to check at runtime
  const isDevelopment = process.env.NODE_ENV === 'development' ||
    !process.env.NODE_ENV ||
    process.env.NEXT_PHASE === 'phase-development-server' ||
    process.env.VERCEL_ENV !== 'production';

  if (isDevelopment || process.env.DISABLE_OTEL === 'true') {
    // Early return to prevent any imports that might cause issues
    return;
  }

  // Only run in Node.js runtime (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const globalWithSdk = globalThis as GlobalWithOtel;

  if (globalWithSdk[GLOBAL_OTEL_SDK_KEY]) {
    return;
  }

  const tracingDisabled = process.env.ENABLE_OTEL_TRACING === 'false';
  if (tracingDisabled) {
    return;
  }

  let otelDiag: typeof import('@opentelemetry/api').diag | null = null;
  try {
    const [
      { diag, DiagConsoleLogger, DiagLogLevel },
      { NodeSDK },
      { getNodeAutoInstrumentations },
      { OTLPTraceExporter },
      { Resource },
      { SemanticResourceAttributes },
    ] = await Promise.all([
      /*
      import('@opentelemetry/api'),
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      */
      Promise.resolve(null as any), // Mock imports
      Promise.resolve(null as any),
      Promise.resolve(null as any),
      Promise.resolve(null as any),
      Promise.resolve(null as any),
      Promise.resolve(null as any),
    ]);

    otelDiag = diag;
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://127.0.0.1:4318/v1/traces';
    const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

    const traceExporter = new OTLPTraceExporter({
      url: endpoint,
      headers,
    });

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'whatsapp-owona-app',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION ?? 'dev',
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-undici': {
            enabled: true,
          },
        }),
      ],
    });

    await sdk.start();
    globalWithSdk[GLOBAL_OTEL_SDK_KEY] = sdk;

    const shutdown = async () => {
      try {
        await sdk.shutdown();
      } catch (error) {
        otelDiag?.error('Failed to shutdown OpenTelemetry SDK', error as Error);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('beforeExit', shutdown);
  } catch (error) {
    if (otelDiag) {
      otelDiag.error('Failed to initialise OpenTelemetry', error as Error);
    } else {
      console.error('[OTel] Failed to initialise OpenTelemetry', error);
    }
  }
}


