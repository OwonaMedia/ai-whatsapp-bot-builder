import type { Logger } from '../utils/logger.js';
import { loadConfig, type SupportConfig } from './config.js';
import { createSupportSupabase, type SupportSupabaseClient } from './supabaseClient.js';
import { KnowledgeBase } from './knowledgeBase.js';
import { LlmClient } from './llmClient.js';

export interface SupportContext {
  config: SupportConfig;
  supabase: SupportSupabaseClient;
  knowledgeBase: KnowledgeBase;
  llmClient: LlmClient;
}

export async function createSupportContext(logger: Logger): Promise<SupportContext> {
  const config = loadConfig();

  const supabase = createSupportSupabase(config);
  // KnowledgeBase erhält jetzt auch Supabase-Client für Reverse Engineering Dokumentation
  const knowledgeBase = new KnowledgeBase(config, logger, supabase);
  await knowledgeBase.load();
  const llmClient = new LlmClient(config, logger);

  return {
    config,
    supabase,
    knowledgeBase,
    llmClient,
  };
}

