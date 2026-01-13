import { Bot, BotFlow, FlowNode } from '@/types/bot';

export enum UseCaseType {
  CUSTOMER_SERVICE = 'customer_service',
  BOOKING = 'booking',
  ECOMMERCE = 'ecommerce',
  INFORMATION = 'information',
  GENERAL = 'general', // ⚠️ WARNUNG
  ENTERTAINMENT = 'entertainment', // ❌ VERBOTEN
}

export interface ComplianceCheck {
  useCaseType: UseCaseType | null;
  complianceScore: number; // 0-100
  warnings: string[];
  suggestions: string[];
  isCompliant: boolean;
  metaCompliant: boolean; // Meta WhatsApp Richtlinien (ab 2026)
}

export class ComplianceChecker {
  /**
   * Check bot compliance with Meta guidelines
   */
  static async checkBot(bot: Bot, flow?: BotFlow): Promise<ComplianceCheck> {
    let score = 100;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 1. Use-Case Declaration Check
    const useCaseType = this.classifyUseCase(bot, flow);
    
    if (!bot.use_case || !bot.use_case.trim()) {
      score -= 30;
      warnings.push('Kein Use-Case definiert');
      suggestions.push('Definiere einen spezifischen Use-Case für deinen Bot');
    } else if (useCaseType === UseCaseType.GENERAL) {
      score -= 40;
      warnings.push('Use-Case ist zu allgemein');
      suggestions.push('Wähle einen spezifischen Business-Use-Case (z.B. Kundenservice, Buchungen, E-Commerce)');
    } else if (useCaseType === UseCaseType.ENTERTAINMENT) {
      score -= 50;
      warnings.push('Entertainment-Bots sind nicht erlaubt');
      suggestions.push('Bitte wähle einen Business-Use-Case');
    }

    // 2. Flow Analysis (if available)
    if (flow) {
      const flowCheck = this.checkFlow(flow, useCaseType);
      score -= flowCheck.scoreDeduction;
      warnings.push(...flowCheck.warnings);
      suggestions.push(...flowCheck.suggestions);
    }

    // 3. AI Prompts Check (if flow available)
    if (flow) {
      const promptCheck = this.checkAIPrompts(flow, useCaseType);
      score -= promptCheck.scoreDeduction;
      warnings.push(...promptCheck.warnings);
      suggestions.push(...promptCheck.suggestions);
    }

    // 4. Meta Compliance Check
    const metaCompliant = useCaseType !== UseCaseType.GENERAL && 
                          useCaseType !== UseCaseType.ENTERTAINMENT &&
                          score >= 70;

    if (!metaCompliant) {
      warnings.push('⚠️ Bot entspricht möglicherweise nicht den Meta WhatsApp Richtlinien (ab 15. Jan 2026)');
      suggestions.push('Stelle sicher, dass dein Bot einen spezifischen Business-Use-Case hat');
    }

    return {
      useCaseType,
      complianceScore: Math.max(0, Math.min(100, score)),
      warnings: [...new Set(warnings)], // Remove duplicates
      suggestions: [...new Set(suggestions)],
      isCompliant: score >= 70,
      metaCompliant,
    };
  }

  /**
   * Classify use case type based on bot configuration and flow
   */
  private static classifyUseCase(bot: Bot, flow?: BotFlow): UseCaseType {
    const useCaseLower = (bot.use_case || '').toLowerCase();
    
    // Check for forbidden types
    if (useCaseLower.includes('entertainment') || 
        useCaseLower.includes('spiel') ||
        useCaseLower.includes('game') ||
        useCaseLower.includes('trivia')) {
      return UseCaseType.ENTERTAINMENT;
    }

    // Check for general/forbidden types
    if (useCaseLower.includes('allgemein') ||
        useCaseLower.includes('general') ||
        useCaseLower.includes('chat') ||
        useCaseLower.includes('assistant') && !useCaseLower.includes('business')) {
      return UseCaseType.GENERAL;
    }

    // Check for specific business use cases
    if (useCaseLower.includes('kundenservice') ||
        useCaseLower.includes('customer service') ||
        useCaseLower.includes('support') ||
        useCaseLower.includes('faq') ||
        useCaseLower.includes('help')) {
      return UseCaseType.CUSTOMER_SERVICE;
    }

    if (useCaseLower.includes('buchung') ||
        useCaseLower.includes('booking') ||
        useCaseLower.includes('reservierung') ||
        useCaseLower.includes('reservation') ||
        useCaseLower.includes('termin')) {
      return UseCaseType.BOOKING;
    }

    if (useCaseLower.includes('ecommerce') ||
        useCaseLower.includes('e-commerce') ||
        useCaseLower.includes('shop') ||
        useCaseLower.includes('produkt') ||
        useCaseLower.includes('product') ||
        useCaseLower.includes('bestellung') ||
        useCaseLower.includes('order')) {
      return UseCaseType.ECOMMERCE;
    }

    if (useCaseLower.includes('information') ||
        useCaseLower.includes('news') ||
        useCaseLower.includes('update') ||
        useCaseLower.includes('event')) {
      return UseCaseType.INFORMATION;
    }

    // Default to general if unclear
    if (!useCaseLower || useCaseLower.trim().length === 0) {
      return UseCaseType.GENERAL;
    }

    return UseCaseType.CUSTOMER_SERVICE; // Safe default
  }

  /**
   * Check flow structure for compliance patterns
   */
  private static checkFlow(flow: BotFlow, useCaseType: UseCaseType): {
    scoreDeduction: number;
    warnings: string[];
    suggestions: string[];
  } {
    let scoreDeduction = 0;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const aiNodes = flow.nodes.filter((n) => n.type === 'ai');
    const questionNodes = flow.nodes.filter((n) => n.type === 'question');
    const endNodes = flow.nodes.filter((n) => n.type === 'end');

    // Too many AI nodes without structure
    if (aiNodes.length > 5 && questionNodes.length === 0) {
      scoreDeduction += 15;
      warnings.push('Zu viele AI Nodes ohne strukturierte Interaktionen');
      suggestions.push('Füge Question Nodes und spezifische Routings hinzu');
    }

    // Missing end nodes
    if (endNodes.length === 0) {
      scoreDeduction += 10;
      warnings.push('Keine End Nodes im Flow gefunden');
      suggestions.push('Füge End Nodes hinzu, um Conversations abzuschließen');
    }

    // Check for specific use case patterns
    if (useCaseType === UseCaseType.BOOKING && questionNodes.length < 2) {
      scoreDeduction += 5;
      suggestions.push('Buchungs-Bots sollten Question Nodes für Datum/Zeit haben');
    }

    if (useCaseType === UseCaseType.CUSTOMER_SERVICE && aiNodes.length === 0) {
      scoreDeduction += 5;
      suggestions.push('Kundenservice-Bots profitieren von AI Nodes für FAQ');
    }

    return { scoreDeduction, warnings, suggestions };
  }

  /**
   * Check AI prompts for compliance
   */
  private static checkAIPrompts(flow: BotFlow, useCaseType: UseCaseType): {
    scoreDeduction: number;
    warnings: string[];
    suggestions: string[];
  } {
    let scoreDeduction = 0;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const aiNodes = flow.nodes.filter((n) => n.type === 'ai');

    for (const node of aiNodes) {
      const prompt = (node.data.config?.ai_prompt || '').toLowerCase();

      // Check for general/conversational patterns
      const forbiddenPatterns = [
        'allgemein',
        'general',
        'antworte auf alles',
        'answer anything',
        'freie gespräche',
        'free conversation',
        'unterhalte dich',
        'have a conversation',
      ];

      for (const pattern of forbiddenPatterns) {
        if (prompt.includes(pattern)) {
          scoreDeduction += 20;
          warnings.push(`AI-Prompt in Node "${node.data.label}" ist zu allgemein`);
          suggestions.push('Spezifiziere den Use-Case im AI-Prompt (z.B. "Antworte NUR zu Produkten")');
        }
      }

      // Check for use-case-specific keywords
      if (prompt.length > 0 && !prompt.includes('nur') && !prompt.includes('only')) {
        if (useCaseType !== UseCaseType.GENERAL) {
          scoreDeduction += 5;
          suggestions.push(`Füge Einschränkungen hinzu (z.B. "Antworte NUR zu ${this.getUseCaseGerman(useCaseType)}")`);
        }
      }

      // Check for good patterns
      const goodPatterns = [
        'nur zu',
        'only to',
        'speziell für',
        'specifically for',
        'business',
        'kundenservice',
        'customer service',
      ];

      const hasGoodPattern = goodPatterns.some((pattern) => prompt.includes(pattern));
      if (prompt.length > 50 && !hasGoodPattern) {
        scoreDeduction += 10;
        suggestions.push('Füge Use-Case-spezifische Einschränkungen in den Prompt ein');
      }
    }

    return { scoreDeduction, warnings, suggestions };
  }

  /**
   * Get German translation for use case type
   */
  private static getUseCaseGerman(useCaseType: UseCaseType): string {
    const translations: Record<UseCaseType, string> = {
      [UseCaseType.CUSTOMER_SERVICE]: 'Kundenservice-Anfragen',
      [UseCaseType.BOOKING]: 'Buchungsanfragen',
      [UseCaseType.ECOMMERCE]: 'Produkte und Bestellungen',
      [UseCaseType.INFORMATION]: 'Informationen',
      [UseCaseType.GENERAL]: 'allgemeine Fragen',
      [UseCaseType.ENTERTAINMENT]: 'Unterhaltung',
    };
    return translations[useCaseType] || 'spezifische Anfragen';
  }

  /**
   * Get suggested use case based on bot name/description
   */
  static suggestUseCase(bot: Bot): UseCaseType | null {
    const text = `${bot.name} ${bot.description || ''}`.toLowerCase();

    if (text.includes('support') || text.includes('service') || text.includes('faq')) {
      return UseCaseType.CUSTOMER_SERVICE;
    }
    if (text.includes('booking') || text.includes('buchung') || text.includes('termin')) {
      return UseCaseType.BOOKING;
    }
    if (text.includes('shop') || text.includes('produkt') || text.includes('order')) {
      return UseCaseType.ECOMMERCE;
    }
    if (text.includes('info') || text.includes('news') || text.includes('event')) {
      return UseCaseType.INFORMATION;
    }

    return null;
  }
}

