import { describe, it, expect } from 'vitest';
import { AgentProfiles } from '../agentProfiles.js';

describe('AgentProfiles', () => {
  it('sollte alle Agent-Profile definieren', () => {
    expect(AgentProfiles).toBeDefined();
    expect(Object.keys(AgentProfiles).length).toBeGreaterThan(0);
  });

  it('sollte alle Agent-Profile mit korrekter Struktur haben', () => {
    for (const [id, profile] of Object.entries(AgentProfiles)) {
      expect(profile.id).toBe(id);
      expect(profile.tier).toMatch(/^(tier0|tier1|tier2)$/);
      expect(profile.label).toBeDefined();
      expect(profile.description).toBeDefined();
      expect(Array.isArray(profile.goals)).toBe(true);
      expect(Array.isArray(profile.allowedActions)).toBe(true);
      expect(typeof profile.mustUseReverseEngineering).toBe('boolean');
    }
  });

  it('sollte error-handler-agent als tier0 definieren', () => {
    const errorHandler = AgentProfiles['error-handler-agent'];
    expect(errorHandler).toBeDefined();
    expect(errorHandler.tier).toBe('tier0');
    expect(errorHandler.allowedActions).toContain('error_retry');
  });

  it('sollte support-agent als tier1 definieren', () => {
    const supportAgent = AgentProfiles['support-agent'];
    expect(supportAgent).toBeDefined();
    expect(supportAgent.tier).toBe('tier1');
  });

  it('sollte supabase-analyst-agent als tier2 definieren', () => {
    const supabaseAgent = AgentProfiles['supabase-analyst-agent'];
    expect(supabaseAgent).toBeDefined();
    expect(supabaseAgent.tier).toBe('tier2');
  });
});

