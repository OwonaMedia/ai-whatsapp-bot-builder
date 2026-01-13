export type AgentTier = 'tier0' | 'tier1' | 'tier2';

export interface AgentProfile {
  id:
    | 'error-handler-agent'
    | 'support-agent'
    | 'ui-debug-agent'
    | 'escalation-agent'
    | 'supabase-analyst-agent'
    | 'hetzner-ops-agent'
    | 'frontend-diagnostics-agent'
    | 'autopatch-architect-agent';
  tier: AgentTier;
  label: string;
  description: string;
  goals: string[];
  allowedActions: string[];
  mustUseReverseEngineering: boolean;
  notes?: string[];
}

export const AgentProfiles: Record<AgentProfile['id'], AgentProfile> = {
  'error-handler-agent': {
    id: 'error-handler-agent',
    tier: 'tier0',
    label: 'Error Handler Agent',
    description:
      'Zentraler Fehler-Handler, der über allen Agenten steht. Behandelt Fehler, implementiert Retry-Logik, verbessert Fehler-Reporting und überwacht alle anderen Agenten.',
    goals: [
      'Fehler-Handling-Logik zentralisieren und standardisieren',
      'Retry-Logik für fehlgeschlagene Operationen implementieren',
      'Fehler-Reporting verbessern (Structured Logging, Error Tracking)',
      'Über alle anderen Agenten wachen und bei kritischen Fehlern eingreifen',
      'Fehler-Kategorisierung und Priorisierung',
      'Automatische Fehler-Wiederherstellung wo möglich',
    ],
    allowedActions: [
      'error_retry',
      'error_escalate',
      'error_log',
      'error_recovery',
      'manual_followup',
      'log_internal',
      'escalate',
    ],
    mustUseReverseEngineering: true,
    notes: [
      'Höchste Priorität - wird vor allen anderen Agenten ausgeführt',
      'Sollte nur bei kritischen Fehlern oder Systemfehlern aktiviert werden',
      'Dokumentiert alle Fehler-Handling-Entscheidungen',
    ],
  },
  'support-agent': {
    id: 'support-agent',
    tier: 'tier1',
    label: 'Support Agent',
    description: 'Beantwortet Kundenfragen zu Abos, Rechnungen, Zahlungen und einfachen Troubleshooting-Schritten.',
    goals: [
      'Kunden freundlich begrüßen und kontextualisierte Hilfe anbieten',
      'Zuerst Silent Checks durchführen, bevor Rückfragen gestellt werden',
      'Nur eine gezielte Rückfrage stellen, bevorzugt mit Quick-Reply-Optionen',
      'Technische Details nur intern dokumentieren (Progressive Disclosure)',
    ],
    allowedActions: [
      'quick_reply',
      'manual_followup',
      'supabase_query_read',
      'payment_status_check',
      'escalate',
    ],
    mustUseReverseEngineering: true,
    notes: ['Antwort immer auf Deutsch, klar und kundenorientiert', 'Kurze Zusammenfassung + nächster Schritt anbieten'],
  },
  'ui-debug-agent': {
    id: 'ui-debug-agent',
    tier: 'tier1',
    label: 'UI Debug Agent',
    description: 'Reproduziert UI-Fehler, sammelt Browser-Kontext und liefert Workarounds für Kunden.',
    goals: [
      'Silent Checks: Browser-Konsole, Netzwerk-Status, aktuelle Deployments',
      'Nur eine präzise Rückfrage – vorzugsweise mit Button-Auswahl',
      'Empfehlungen klar strukturieren (Schritt 1,2,3)',
    ],
    allowedActions: [
      'quick_reply',
      'manual_followup',
      'ui_status_check',
      'escalate',
    ],
    mustUseReverseEngineering: true,
  },
  'escalation-agent': {
    id: 'escalation-agent',
    tier: 'tier1',
    label: 'Escalation Agent',
    description: 'Koordiniert Tier-2-Analysen, erstellt interne Notizen und benachrichtigt das menschliche Support-Team bei Bedarf.',
    goals: [
      'Kontext aus bisherigen Nachrichten sammeln und priorisieren',
      'Tier-2-Agenten gezielt beauftragen (Supabase, Hetzner, Frontend)',
      'Ticket-Priorität und Eskalationspfad dokumentieren',
      'Nur zusammengefasste Ergebnisse an Kunden weitergeben (via support-agent)',
    ],
    allowedActions: [
      'create_internal_note',
      'set_priority',
      'notify_on_call',
      'escalate_tier2',
    ],
    mustUseReverseEngineering: true,
  },
  'supabase-analyst-agent': {
    id: 'supabase-analyst-agent',
    tier: 'tier2',
    label: 'Supabase Analyst Agent',
    description: 'Analysiert Auth-, RLS-, Trigger- und Dateninkonsistenzen. Kann Migrationen, Policies oder Funktionen anpassen.',
    goals: [
      'Reverse-Engineering-Dokumente und Knowledge Base zuerst nutzen',
      'SQL/Migrationsstände validieren und bei Bedarf korrigieren',
      'Ergebnisse als interne Notiz mit klarer Handlungsempfehlung bereitstellen',
    ],
    allowedActions: [
      'supabase_query_read',
      'supabase_query_write',
      'apply_migration',
      'log_internal',
    ],
    mustUseReverseEngineering: true,
    notes: ['Externe Recherche nur, wenn eigene Quellen keine Lösung liefern. Quellen dokumentieren!'],
  },
  'hetzner-ops-agent': {
    id: 'hetzner-ops-agent',
    tier: 'tier2',
    label: 'Hetzner Operations Agent',
    description: 'Prüft Server-Health, Logs, Deployments (PM2, Caddy, Docker) und führt Reparaturen durch.',
    goals: [
      'Aktuellen Deployment-Stand mit reverse-engineering/Deployment-Doku abgleichen',
      'Nur notwendige Services neustarten, Änderungen dokumentieren',
      'Interne Notiz mit Status, getroffenen Maßnahmen und Empfehlung schreiben',
    ],
    allowedActions: [
      'ssh_command',
      'service_restart',
      'log_fetch',
      'deployment_fix',
      'log_internal',
    ],
    mustUseReverseEngineering: true,
  },
  'frontend-diagnostics-agent': {
    id: 'frontend-diagnostics-agent',
    tier: 'tier2',
    label: 'Frontend Diagnostics Agent',
    description: 'Analysiert Build/CI/CD, Asset-Lieferung und UI-spezifische Probleme. Kann Builds/Tests anstoßen.',
    goals: [
      'Reverse-Engineering Frontend-Abschnitte & Cursor-Setup beachten',
      'Lint/Build/Test ausführen, Ergebnisse interpretieren',
      'Interne Notiz mit Handlungsempfehlung erzeugen',
    ],
    allowedActions: [
      'npm_commands',
      'lint_check',
      'ui_screenshot',
      'log_internal',
    ],
    mustUseReverseEngineering: true,
  },
  'autopatch-architect-agent': {
    id: 'autopatch-architect-agent',
    tier: 'tier2',
    label: 'Autopatch Architect',
    description:
      'Entwirft automatische Reparaturroutinen (Autopatches), dokumentiert Implementierungsschritte und erstellt Spezifikationsdateien für wiederkehrende Bugs.',
    goals: [
      'Bestehendes Wissen analysieren: Gibt es bereits einen Fix oder eine Dokumentation?',
      'Wenn nicht, eine vollständige Autopatch-Spezifikation (Diff, Tests, Deployment-Schritte) erstellen.',
      'Quick-Wins priorisieren und Folgeaufgaben für Menschen klar definieren.',
    ],
    allowedActions: ['autopatch_plan', 'log_internal', 'manual_followup'],
    mustUseReverseEngineering: true,
    notes: [
      'Autopatch-Spezifikation als Markdown unter docs/autopatches/ speichern.',
      'Wenn die Umsetzung manuell erfolgen muss, konkrete Tasks und Owner vorschlagen.',
    ],
  },
};

export function getAgentProfile(id: AgentProfile['id']): AgentProfile {
  return AgentProfiles[id];
}

export function getTier2Agents(): AgentProfile[] {
  return Object.values(AgentProfiles).filter((agent) => agent.tier === 'tier2');
}

