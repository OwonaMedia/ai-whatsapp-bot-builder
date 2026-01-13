import 'dotenv/config';
import http from 'node:http';
import { createLogger } from './utils/logger.js';
import { createSupportContext } from './services/supportContext.js';
import { SupportTicketRouter } from './services/ticketRouter.js';
import { ServiceHeartbeat } from './services/serviceHeartbeat.js';
import { getHealthStatus } from './utils/healthCheck.js';
import { metricsCollector } from './utils/metricsCollector.js';
import { MonitoringService } from './services/monitoring/monitoring-service.js';
import { UpdateHandler } from './services/auto-updates/update-handler.js';

const logger = createLogger();

async function bootstrap() {
  const context = await createSupportContext(logger);
  const router = new SupportTicketRouter(context, logger);
  const heartbeatLogger = logger.child({ component: 'ServiceHeartbeat' });
  const heartbeat = new ServiceHeartbeat(
    context.supabase,
    heartbeatLogger,
    'support-mcp',
    30_000,
    () => router.getHeartbeatMeta()
  );

  // Initialize external API monitoring service
  const monitoringLogger = logger.child({ component: 'MonitoringService' });
  const monitoringService = new MonitoringService(
    context.supabase,
    monitoringLogger,
    parseInt(process.env.EXTERNAL_API_CHECK_INTERVAL_MS || String(24 * 60 * 60 * 1000), 10) // Default: 24 hours
  );

  // Initialize auto-update handler
  const updateHandler = new UpdateHandler(context.supabase, monitoringLogger);

  // Start monitoring service
  monitoringService.start();

  // Health-Check HTTP-Server starten
  const healthCheckServer = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const pathname = requestUrl.pathname;

    if (pathname === '/health' && req.method === 'GET') {
      try {
        const healthStatus = await getHealthStatus(context.supabase, router);
        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthStatus, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: String(error) }, null, 2));
      }
    } else if (pathname === '/metrics' && req.method === 'GET') {
      const format = requestUrl.searchParams.get('format');
      const metrics = metricsCollector.getMetrics();
      const routerMeta = router.getHeartbeatMeta();

      if (format === 'prometheus') {
        const ticketChannelStatus = routerMeta.ticketChannelStatus === 'SUBSCRIBED' ? 1 : 0;
        const messageChannelStatus = routerMeta.messageChannelStatus === 'SUBSCRIBED' ? 1 : 0;
        const prometheus =
          metricsCollector.getPrometheusMetrics() +
          `\n# HELP support_realtime_ticket_channel_status Ticket channel subscribed (1) or not (0)\n` +
          `# TYPE support_realtime_ticket_channel_status gauge\n` +
          `support_realtime_ticket_channel_status{status="${routerMeta.ticketChannelStatus ?? 'unknown'}"} ${ticketChannelStatus}\n\n` +
          `# HELP support_realtime_message_channel_status Message channel subscribed (1) or not (0)\n` +
          `# TYPE support_realtime_message_channel_status gauge\n` +
          `support_realtime_message_channel_status{status="${routerMeta.messageChannelStatus ?? 'unknown'}"} ${messageChannelStatus}\n\n` +
          `# HELP support_realtime_reconnects_total Number of realtime reconnect attempts\n` +
          `# TYPE support_realtime_reconnects_total counter\n` +
          `support_realtime_reconnects_total ${routerMeta.realtimeReconnects ?? 0}\n`;
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(prometheus);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...metrics, realtime: routerMeta }, null, 2));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  const healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT || '3002', 10);
  healthCheckServer.listen(healthCheckPort, () => {
    logger.info({ port: healthCheckPort }, 'Health-Check-Server gestartet');
  });

  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals | 'manual' = 'manual') => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Fahre Support MCP Server herunter');
    healthCheckServer.close(() => {
      logger.info('Health-Check-Server gestoppt');
    });
    monitoringService.stop();
    await router.stop().catch((error: unknown) => {
      logger.warn({ err: error }, 'Router konnte nicht sauber stoppen');
    });
    await heartbeat.stop('down').catch((error: unknown) => {
      heartbeatLogger.warn({ err: error }, 'Heartbeat konnte nicht gestoppt werden');
    });
    process.exit(0);
  };

  process.on('SIGINT', (signal) => {
    void shutdown(signal);
  });
  process.on('SIGTERM', (signal) => {
    void shutdown(signal);
  });

  heartbeat.start('up');
  await router.start();

  logger.info('Support MCP Server läuft. Warten auf neue Tickets …');
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Support MCP Server konnte nicht gestartet werden');
  process.exit(1);
});

