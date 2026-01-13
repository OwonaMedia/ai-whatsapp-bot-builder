import path from 'node:path';
import { z } from 'zod';

const configSchema = z.object({
  SUPABASE_SERVICE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  GROQ_API_KEY: z.string().min(10).optional(),
  HETZNER_API_TOKEN: z.string().min(10).optional(),
  HETZNER_SSH_HOST: z.string().min(1).optional(),
  HETZNER_SSH_USER: z.string().min(1).optional(),
  HETZNER_SSH_PASSWORD: z.string().min(1).optional(),
  HETZNER_SSH_KEY_PATH: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_USER: z.string().optional(),
  KNOWLEDGE_ROOT: z.string().optional(),
  UX_GUIDE_ROOT: z.string().optional(),
  FRONTEND_ROOT: z.string().optional(), // Remote-Server Pfad: /var/www/whatsapp-bot-builder/frontend
});

export type SupportConfig = z.infer<typeof configSchema> & {
  knowledgeRoot: string;
  uxGuideRoot: string;
  frontendRoot: string; // Frontend-Root-Verzeichnis (Remote: /var/www/whatsapp-bot-builder/frontend)
  monitor: {
    intervalMs: number;
    staleMinutes: number;
    reminderMinutes: number;
  };
};

export function loadConfig(): SupportConfig {
  const parsed = configSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Ungültige Konfiguration: ${parsed.error.message}`);
  }

  const cwd = process.cwd();
  const knowledgeRoot = parsed.data.KNOWLEDGE_ROOT
    ? path.resolve(cwd, parsed.data.KNOWLEDGE_ROOT)
    : path.resolve(cwd, '../reverse engineering');
  const uxGuideRoot = parsed.data.UX_GUIDE_ROOT
    ? path.resolve(cwd, parsed.data.UX_GUIDE_ROOT)
    : path.resolve(cwd, '../docs');
  
  // Frontend-Root: Remote-Server Pfad oder lokaler Fallback
  const frontendRoot = parsed.data.FRONTEND_ROOT
    ? parsed.data.FRONTEND_ROOT // Absoluter Pfad auf Remote-Server
    : process.cwd().endsWith('support-mcp-server')
      ? path.resolve(cwd, '..', 'frontend') // Lokaler Fallback
      : path.resolve(cwd, 'frontend'); // Fallback wenn direkt im Root

  const intervalSeconds = Number.parseInt(process.env.SUPPORT_MONITOR_INTERVAL_SECONDS ?? '', 10);
  const staleMinutes = Number.parseInt(process.env.SUPPORT_MONITOR_STALE_MINUTES ?? '', 10);
  const reminderMinutes = Number.parseInt(process.env.SUPPORT_MONITOR_REMINDER_MINUTES ?? '', 10);

  const monitor = {
    intervalMs: Number.isFinite(intervalSeconds) && intervalSeconds > 0 ? intervalSeconds * 1000 : 60_000,
    staleMinutes: Number.isFinite(staleMinutes) && staleMinutes > 0 ? staleMinutes : 10,
    reminderMinutes: Number.isFinite(reminderMinutes) && reminderMinutes > 0 ? reminderMinutes : 15,
  };

  return {
    ...parsed.data,
    knowledgeRoot,
    uxGuideRoot,
    frontendRoot,
    monitor,
  };
}

