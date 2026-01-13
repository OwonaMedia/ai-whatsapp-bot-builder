/**
 * Whitelist für erlaubte Hetzner-Server-Befehle
 * Alle Befehle müssen gegen diese Whitelist geprüft werden, bevor sie ausgeführt werden
 */

export interface AllowedCommand {
  command: string;
  args?: string[];
  description: string;
  category: 'pm2' | 'caddy' | 'systemctl' | 'docker';
}

/**
 * Erlaubte PM2-Befehle
 */
const PM2_COMMANDS: AllowedCommand[] = [
  {
    command: 'pm2',
    args: ['restart'],
    description: 'PM2 Prozess neu starten',
    category: 'pm2',
  },
  {
    command: 'pm2',
    args: ['stop'],
    description: 'PM2 Prozess stoppen',
    category: 'pm2',
  },
  {
    command: 'pm2',
    args: ['start'],
    description: 'PM2 Prozess starten',
    category: 'pm2',
  },
  {
    command: 'pm2',
    args: ['reload'],
    description: 'PM2 Prozess neu laden',
    category: 'pm2',
  },
  {
    command: 'pm2',
    args: ['logs'],
    description: 'PM2 Logs anzeigen',
    category: 'pm2',
  },
  {
    command: 'pm2',
    args: ['save'],
    description: 'PM2 Konfiguration speichern',
    category: 'pm2',
  },
  {
    command: 'pm2',
    args: ['list'],
    description: 'PM2 Prozess-Liste anzeigen',
    category: 'pm2',
  },
];

/**
 * Erlaubte Caddy-Befehle
 */
const CADDY_COMMANDS: AllowedCommand[] = [
  {
    command: 'caddy',
    args: ['reload'],
    description: 'Caddy Konfiguration neu laden',
    category: 'caddy',
  },
  {
    command: 'caddy',
    args: ['validate'],
    description: 'Caddy Konfiguration validieren',
    category: 'caddy',
  },
  {
    command: 'caddy',
    args: ['test'],
    description: 'Caddy Konfiguration testen',
    category: 'caddy',
  },
];

/**
 * Erlaubte systemctl-Befehle (nur für spezifische Services)
 */
const SYSTEMCTL_SERVICES = ['caddy', 'docker', 'n8n'];
const SYSTEMCTL_COMMANDS: AllowedCommand[] = [
  {
    command: 'systemctl',
    args: ['restart'],
    description: 'Systemd Service neu starten',
    category: 'systemctl',
  },
  {
    command: 'systemctl',
    args: ['reload'],
    description: 'Systemd Service neu laden',
    category: 'systemctl',
  },
  {
    command: 'systemctl',
    args: ['status'],
    description: 'Systemd Service-Status anzeigen',
    category: 'systemctl',
  },
];

/**
 * Erlaubte Docker-Befehle (nur für spezifische Container)
 */
const DOCKER_CONTAINERS = ['whatsapp-bot-builder', 'n8n', 'mcp-afrika-container'];
const DOCKER_COMMANDS: AllowedCommand[] = [
  {
    command: 'docker',
    args: ['restart'],
    description: 'Docker Container neu starten',
    category: 'docker',
  },
  {
    command: 'docker',
    args: ['stop'],
    description: 'Docker Container stoppen',
    category: 'docker',
  },
  {
    command: 'docker',
    args: ['start'],
    description: 'Docker Container starten',
    category: 'docker',
  },
  {
    command: 'docker',
    args: ['logs'],
    description: 'Docker Container-Logs anzeigen',
    category: 'docker',
  },
];

/**
 * Alle erlaubten Befehle
 */
const ALL_ALLOWED_COMMANDS = [
  ...PM2_COMMANDS,
  ...CADDY_COMMANDS,
  ...SYSTEMCTL_COMMANDS,
  ...DOCKER_COMMANDS,
];

/**
 * Prüft ob ein Befehl gegen die Whitelist erlaubt ist
 */
export function isCommandAllowed(commandString: string): { allowed: boolean; reason?: string; command?: AllowedCommand } {
  // Parse Befehl
  const parts = commandString.trim().split(/\s+/);
  if (parts.length === 0) {
    return { allowed: false, reason: 'Leerer Befehl' };
  }

  const command = parts[0];
  const args = parts.slice(1);

  // Prüfe PM2-Befehle
  if (command === 'pm2' && args.length > 0) {
    const pm2Command = PM2_COMMANDS.find((c) => c.args?.[0] === args[0]);
    if (pm2Command) {
      // Zusätzliche Validierung für PM2: Prüfe ob App-Name erlaubt ist
      if (args[0] === 'restart' || args[0] === 'stop' || args[0] === 'start' || args[0] === 'reload') {
        if (args.length > 1) {
          const appName = args[1];
          // Erlaubte App-Namen: whatsapp-bot-builder oder alle (--update-env)
          if (appName === 'whatsapp-bot-builder' || appName === '--update-env' || appName === 'all') {
            return { allowed: true, command: pm2Command };
          }
          return { allowed: false, reason: `PM2 App-Name nicht erlaubt: ${appName}` };
        }
        // Kein App-Name = alle Apps (erlaubt)
        return { allowed: true, command: pm2Command };
      }
      return { allowed: true, command: pm2Command };
    }
  }

  // Prüfe Caddy-Befehle
  if (command === 'caddy' && args.length > 0) {
    const caddyCommand = CADDY_COMMANDS.find((c) => c.args?.[0] === args[0]);
    if (caddyCommand) {
      return { allowed: true, command: caddyCommand };
    }
  }

  // Prüfe systemctl-Befehle
  if (command === 'systemctl' && args.length >= 2) {
    const systemctlCommand = SYSTEMCTL_COMMANDS.find((c) => c.args?.[0] === args[0]);
    if (systemctlCommand) {
      const serviceName = args[1];
      if (SYSTEMCTL_SERVICES.includes(serviceName)) {
        return { allowed: true, command: systemctlCommand };
      }
      return { allowed: false, reason: `systemctl Service nicht erlaubt: ${serviceName}` };
    }
  }

  // Prüfe Docker-Befehle
  if (command === 'docker' && args.length >= 2) {
    const dockerCommand = DOCKER_COMMANDS.find((c) => c.args?.[0] === args[0]);
    if (dockerCommand) {
      const containerName = args[1];
      if (DOCKER_CONTAINERS.includes(containerName)) {
        return { allowed: true, command: dockerCommand };
      }
      return { allowed: false, reason: `Docker Container nicht erlaubt: ${containerName}` };
    }
  }

  return { allowed: false, reason: `Befehl nicht in Whitelist: ${command}` };
}

/**
 * Gibt alle erlaubten Befehle zurück (für Debugging/Logging)
 */
export function getAllowedCommands(): AllowedCommand[] {
  return ALL_ALLOWED_COMMANDS;
}

