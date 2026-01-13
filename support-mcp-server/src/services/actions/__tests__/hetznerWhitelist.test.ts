/**
 * Unit Tests für HetznerWhitelist
 * 
 * Testet Befehl-Whitelist-Prüfung
 */

import { describe, it, expect } from 'vitest';
import { isCommandAllowed, getAllowedCommands } from '../hetznerWhitelist.js';

describe('HetznerWhitelist', () => {
  describe('isCommandAllowed', () => {
    it('sollte erlaubte PM2-Befehle akzeptieren', () => {
      const result = isCommandAllowed('pm2 restart whatsapp-bot-builder');
      expect(result.allowed).toBe(true);
      expect(result.command).toBeDefined();
      expect(result.command?.category).toBe('pm2');
    });

    it('sollte erlaubte PM2-Befehle ohne App-Name akzeptieren', () => {
      const result = isCommandAllowed('pm2 restart');
      expect(result.allowed).toBe(true);
    });

    it('sollte nicht erlaubte PM2-App-Namen ablehnen', () => {
      const result = isCommandAllowed('pm2 restart unauthorized-app');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('nicht erlaubt');
    });

    it('sollte erlaubte Caddy-Befehle akzeptieren', () => {
      const result = isCommandAllowed('caddy reload');
      expect(result.allowed).toBe(true);
      expect(result.command?.category).toBe('caddy');
    });

    it('sollte erlaubte systemctl-Befehle akzeptieren', () => {
      const result = isCommandAllowed('systemctl restart caddy');
      expect(result.allowed).toBe(true);
      expect(result.command?.category).toBe('systemctl');
    });

    it('sollte nicht erlaubte systemctl-Services ablehnen', () => {
      const result = isCommandAllowed('systemctl restart unauthorized-service');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('nicht erlaubt');
    });

    it('sollte erlaubte Docker-Befehle akzeptieren', () => {
      const result = isCommandAllowed('docker restart whatsapp-bot-builder');
      expect(result.allowed).toBe(true);
      expect(result.command?.category).toBe('docker');
    });

    it('sollte nicht erlaubte Docker-Container ablehnen', () => {
      const result = isCommandAllowed('docker restart unauthorized-container');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('nicht erlaubt');
    });

    it('sollte nicht erlaubte Befehle ablehnen', () => {
      const result = isCommandAllowed('rm -rf /');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('nicht in Whitelist');
    });

    it('sollte leere Befehle ablehnen', () => {
      const result = isCommandAllowed('');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      // Leerer String wird als 'Befehl nicht in Whitelist: ' behandelt
      expect(result.reason?.length).toBeGreaterThan(0);
    });
  });

  describe('getAllowedCommands', () => {
    it('sollte alle erlaubten Befehle zurückgeben', () => {
      const commands = getAllowedCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(c => c.category === 'pm2')).toBe(true);
      expect(commands.some(c => c.category === 'caddy')).toBe(true);
      expect(commands.some(c => c.category === 'systemctl')).toBe(true);
      expect(commands.some(c => c.category === 'docker')).toBe(true);
    });
  });
});

