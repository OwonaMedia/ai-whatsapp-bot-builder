#!/usr/bin/env tsx
/**
 * Detaillierte Analyse der Ticket-Verarbeitung
 * 
 * Zeigt jeden Verarbeitungsschritt, misst Dauer und identifiziert Bottlenecks.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';
import { SupportTicketRouter } from '../src/services/ticketRouter.js';
import { createSupportContext } from '../src/services/supportContext.js';
import { createMockLogger } from '../src/services/actions/__tests__/setup.js';
import type { SupportTicket } from '../src/services/ticketRouter.js';

function loadEnv() {
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '..', 'frontend', '.env.local'),
    resolve(process.cwd(), '..', '.env.local'),
  ];

  for (const envPath of envPaths) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (value === 'PLACEHOLDER_VALUE' || value.includes('PLACEHOLDER')) {
              continue;
            }
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
      
      if (process.env.SUPABASE_SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
        }
        if (process.env.SUPABASE_SERVICE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.SUPABASE_SERVICE_URL.trim().replace(/\/$/, '');
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return;
          }
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
  }

  if (!process.env.SUPABASE_SERVICE_URL) {
    console.error('❌ Keine Umgebungsvariablen gefunden!');
    process.exit(1);
  }
}

loadEnv();

interface ProcessingStep {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

class ProcessingAnalyzer {
  private steps: ProcessingStep[] = [];
  private currentStep: ProcessingStep | null = null;

  startStep(name: string, metadata?: Record<string, unknown>) {
    if (this.currentStep) {
      this.endStep();
    }
    this.currentStep = {
      name,
      startTime: Date.now(),
      metadata,
    };
    console.log(`\n⏱️  Start: ${name}`);
    if (metadata) {
      console.log(`   Metadata: ${JSON.stringify(metadata, null, 2)}`);
    }
  }

  endStep(success: boolean = true, error?: string) {
    if (!this.currentStep) return;
    
    this.currentStep.endTime = Date.now();
    this.currentStep.duration = this.currentStep.endTime - this.currentStep.startTime;
    this.currentStep.success = success;
    this.currentStep.error = error;
    
    const duration = this.currentStep.duration;
    const status = success ? '✅' : '❌';
    console.log(`${status} Ende: ${this.currentStep.name} (${duration}ms)`);
    if (error) {
      console.log(`   Fehler: ${error}`);
    }
    
    this.steps.push(this.currentStep);
    this.currentStep = null;
  }

  getSummary() {
    const totalDuration = this.steps.reduce((sum, step) => sum + (step.duration || 0), 0);
    const successfulSteps = this.steps.filter(s => s.success).length;
    const failedSteps = this.steps.filter(s => !s.success).length;
    
    console.log('\n📊 Zusammenfassung:');
    console.log(`   Gesamtdauer: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`   Erfolgreiche Schritte: ${successfulSteps}/${this.steps.length}`);
    console.log(`   Fehlgeschlagene Schritte: ${failedSteps}/${this.steps.length}`);
    
    console.log('\n⏱️  Detaillierte Schritte:');
    for (const step of this.steps) {
      const percentage = totalDuration > 0 ? ((step.duration || 0) / totalDuration * 100).toFixed(1) : '0';
      const status = step.success ? '✅' : '❌';
      console.log(`   ${status} ${step.name}: ${step.duration}ms (${percentage}%)`);
      if (step.error) {
        console.log(`      Fehler: ${step.error}`);
      }
    }
    
    // Identifiziere Bottlenecks
    const sortedSteps = [...this.steps].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    console.log('\n🐌 Top 3 Bottlenecks:');
    for (let i = 0; i < Math.min(3, sortedSteps.length); i++) {
      const step = sortedSteps[i];
      const percentage = totalDuration > 0 ? ((step.duration || 0) / totalDuration * 100).toFixed(1) : '0';
      console.log(`   ${i + 1}. ${step.name}: ${step.duration}ms (${percentage}%)`);
    }
  }
}

async function analyzeTicketProcessing(ticketId: string) {
  console.log('🔍 Detaillierte Ticket-Verarbeitungs-Analyse\n');
  
  const analyzer = new ProcessingAnalyzer();
  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Schritt 1: Ticket laden
  analyzer.startStep('Ticket laden', { ticketId });
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();
  
  if (ticketError || !ticket) {
    analyzer.endStep(false, ticketError?.message || 'Ticket nicht gefunden');
    return;
  }
  analyzer.endStep(true);
  
  console.log(`\n📋 Ticket: ${ticket.title}`);
  console.log(`   Status: ${ticket.status}`);
  console.log(`   Priorität: ${ticket.priority}`);

  // Schritt 2: Knowledge Base Loading
  analyzer.startStep('Knowledge Base Loading');
  const logger = createMockLogger();
  const context = await createSupportContext(logger);
  analyzer.endStep(true);
  
  // Schritt 3: TicketRouter initialisieren
  analyzer.startStep('TicketRouter initialisieren');
  const router = new SupportTicketRouter(context, logger);
  analyzer.endStep(true);

  // Schritt 4: Dispatch
  analyzer.startStep('Dispatch', { ticketId: ticket.id });
  try {
    await router['dispatch']({ eventType: 'UPDATE', ticket: ticket as SupportTicket });
    analyzer.endStep(true);
  } catch (error) {
    analyzer.endStep(false, error instanceof Error ? error.message : String(error));
  }

  // Schritt 5: Warte auf Verarbeitung
  analyzer.startStep('Warte auf Verarbeitung', { waitTime: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 30000));
  analyzer.endStep(true);

  // Schritt 6: Prüfe Ergebnis
  analyzer.startStep('Ergebnis prüfen');
  const { data: updatedTicket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticket.id)
    .single();
  
  const { data: events } = await supabase
    .from('support_automation_events')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: false });
  
  analyzer.endStep(true);
  
  console.log(`\n📊 Ergebnis:`);
  console.log(`   Status: ${updatedTicket?.status || 'unbekannt'} (vorher: ${ticket.status})`);
  console.log(`   Automation-Events: ${events?.length || 0}`);

  // Zeige Zusammenfassung
  analyzer.getSummary();
}

const ticketId = process.argv[2];

if (!ticketId) {
  console.error('❌ Bitte Ticket-ID als Argument angeben: npm run analyze-ticket-processing <ticket-id>');
  process.exit(1);
}

analyzeTicketProcessing(ticketId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fehler bei der Analyse:', error);
    process.exit(1);
  });

