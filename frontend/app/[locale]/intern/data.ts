import { getServiceSupabaseClient } from '@/lib/supabase-service';

const DAYS_TO_ANALYSE = 14;
const SLA_THRESHOLD_HOURS = 36;

type SupportTicket = {
  id: string;
  user_id: string;
  category: string | null;
  priority: string;
  status: string;
  title: string;
  description: string;
  source_metadata: Record<string, unknown> | null;
  assigned_agent?: string | null;
  created_at: string;
  updated_at: string;
  last_escalation?: string | null;
  escalation_path?: unknown;
};

type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  author_type: 'customer' | 'support' | 'system';
  author_user_id: string | null;
  author_name: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  internal_only?: boolean | null;
  quick_reply_options?: unknown;
};

type SupportAutomationEvent = {
  id: string;
  ticket_id: string;
  action_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type InternalPortalMetrics = {
  totalTickets: number;
  openTickets: number;
  investigating: number;
  waitingCustomer: number;
  resolved: number;
  escalated: number;
  averageResolutionTimeHours: number | null;
};

export type BacklogDatum = {
  date: string;
  open: number;
  newTickets: number;
  resolvedTickets: number;
  slaRisk: number;
};

export type PriorityRisk = {
  priority: string;
  open: number;
  aged: number;
  avgAgeHours: number;
};

export type AgentLoad = {
  agent: string;
  active: number;
  waiting: number;
  backlog: number;
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  occurrences: number;
};

export type PlanAction = {
  type: string;
  description: string;
  status?: string;
  payload?: Record<string, unknown>;
};

export type PlanSummary = {
  agent?: string;
  summary?: string;
  status?: string;
  actions: PlanAction[];
};

export type InternalMessage = {
  id: string;
  authorType: 'customer' | 'support' | 'system';
  authorName: string | null;
  createdAt: string;
  message: string;
  metadata: Record<string, unknown>;
  internalOnly: boolean;
  tier: 'tier1' | 'tier2' | 'system';
  quickReplies: string[];
};

export type AutomationEvent = {
  id: string;
  actionType: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type ServiceStatus = {
  serviceName: string;
  status: string;
  lastHeartbeat: string;
  meta: Record<string, unknown>;
};

export type InternalPortalTicket = {
  id: string;
  userId: string;
  customer: {
    email?: string | null;
    fullName?: string | null;
    company?: string | null;
    language?: string | null;
    subscriptionTier?: string | null;
    subscriptionStatus?: string | null;
  };
  title: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  assignedAgent?: string | null;
  createdAt: string;
  updatedAt: string;
  lastEscalation?: string | null;
  escalationPath: Array<{
    agent: string;
    status: string;
    timestamp: string;
  }>;
  messages: InternalMessage[];
  automation: AutomationEvent[];
  plan: PlanSummary | null;
  knowledge: KnowledgeEntry[];
};

export type KnowledgeSuggestion = {
  id: string;
  ticketId: string;
  ticketTitle: string;
  tags: string[];
  relatedAgent?: string;
};

export type InternalPortalData = {
  tickets: InternalPortalTicket[];
  metrics: InternalPortalMetrics;
  insights: {
    backlog: BacklogDatum[];
    priorityRisk: PriorityRisk[];
    agentLoad: AgentLoad[];
    slaBreaches: number;
    medianFirstResponseMinutes: number | null;
  };
  knowledgeInventory: KnowledgeEntry[];
  suggestions: KnowledgeSuggestion[];
  services: ServiceStatus[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normaliseQuickReplies(rawValue: unknown): string[] {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }
        if (isRecord(entry) && typeof entry.label === 'string') {
          return entry.label;
        }
        return null;
      })
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      return normaliseQuickReplies(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function extractPlanFromMessages(
  messages: SupportTicketMessage[]
): PlanSummary | null {
  const withPlan = messages
    .filter(
      (message) =>
        message.metadata &&
        typeof message.metadata === 'object' &&
        (message.metadata as Record<string, unknown>).plan
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (withPlan.length === 0) {
    return null;
  }

  const latestPlanMessage = withPlan[0];
  if (!latestPlanMessage) {
    return null;
  }
  const planPayload = (latestPlanMessage.metadata as Record<string, unknown>)
    .plan;

  if (!isRecord(planPayload)) {
    return null;
  }

  const actionsRaw = Array.isArray(planPayload.actions)
    ? planPayload.actions
    : [];

  const actions: PlanAction[] = actionsRaw
    .filter((action): action is Record<string, unknown> => 
      isRecord(action) && typeof action.type === 'string'
    )
    .map((action) => ({
      type: action.type as string,
      description:
        typeof action.description === 'string'
          ? action.description
          : 'Ohne Beschreibung',
      status:
        typeof action.status === 'string' ? action.status : undefined,
      payload: isRecord(action.payload) ? action.payload : undefined,
    }));

  return {
    agent:
      typeof planPayload.agent === 'string' ? planPayload.agent : undefined,
    summary:
      typeof planPayload.summary === 'string'
        ? planPayload.summary
        : undefined,
    status:
      typeof planPayload.status === 'string'
        ? planPayload.status
        : undefined,
    actions,
  };
}

function extractKnowledgeFromMessages(
  messages: SupportTicketMessage[]
): KnowledgeEntry[] {
  const entries: Record<string, KnowledgeEntry> = {};

  for (const message of messages) {
    if (!message.metadata || typeof message.metadata !== 'object') {
      continue;
    }
    const metadata = message.metadata as Record<string, unknown>;
    const knowledgeRaw = metadata.knowledge;
    if (!Array.isArray(knowledgeRaw)) {
      continue;
    }
    for (const item of knowledgeRaw) {
      if (!isRecord(item) || typeof item.id !== 'string') {
        continue;
      }
      const id = item.id;
      const title =
        typeof item.title === 'string' ? item.title : 'Unbenanntes Dokument';
      if (!entries[id]) {
        entries[id] = { id, title, occurrences: 0 };
      }
      entries[id].occurrences += 1;
    }
  }

  return Object.values(entries).sort(
    (a, b) => b.occurrences - a.occurrences || a.title.localeCompare(b.title)
  );
}

function deriveTierFromMessage(message: SupportTicketMessage): InternalMessage['tier'] {
  if (message.internal_only) {
    return 'tier2';
  }
  if (message.author_type === 'system') {
    return 'system';
  }
  return 'tier1';
}

function computeMetrics(tickets: InternalPortalTicket[]): InternalPortalMetrics {
  const totalTickets = tickets.length;
  let openTickets = 0;
  let investigating = 0;
  let waitingCustomer = 0;
  let resolved = 0;
  let escalated = 0;

  const resolutionDurations: number[] = [];

  for (const ticket of tickets) {
    switch (ticket.status) {
      case 'resolved':
        resolved += 1;
        break;
      case 'waiting_customer':
        waitingCustomer += 1;
        openTickets += 1;
        break;
      case 'closed':
        break;
      case 'investigating':
        investigating += 1;
        openTickets += 1;
        break;
      default:
        openTickets += 1;
        break;
    }

    if (ticket.escalationPath.length > 0) {
      escalated += 1;
    }

    const resolutionMessage = ticket.messages
      .filter((message) => message.authorType !== 'customer')
      .find((message) => message.metadata?.plan && ticket.status === 'resolved');

    if (resolutionMessage) {
      const durationMs =
        new Date(ticket.updatedAt).getTime() -
        new Date(ticket.createdAt).getTime();
      if (Number.isFinite(durationMs) && durationMs > 0) {
        resolutionDurations.push(durationMs);
      }
    }
  }

  const averageResolutionTimeHours =
    resolutionDurations.length > 0
      ? Number(
          (
            resolutionDurations.reduce((sum, value) => sum + value, 0) /
            resolutionDurations.length /
            (1000 * 60 * 60)
          ).toFixed(2)
        )
      : null;

  return {
    totalTickets,
    openTickets,
    investigating,
    waitingCustomer,
    resolved,
    escalated,
    averageResolutionTimeHours,
  };
}

function accumulateKnowledgeInventory(
  tickets: InternalPortalTicket[]
): KnowledgeEntry[] {
  const knowledgeMap = new Map<string, KnowledgeEntry>();

  for (const ticket of tickets) {
    for (const entry of ticket.knowledge) {
      const existing = knowledgeMap.get(entry.id);
      if (existing) {
        existing.occurrences += entry.occurrences;
      } else {
        knowledgeMap.set(entry.id, { ...entry });
      }
    }
  }

  return Array.from(knowledgeMap.values()).sort(
    (a, b) => b.occurrences - a.occurrences || a.title.localeCompare(b.title)
  );
}

function generateSuggestionsFromTickets(
  tickets: InternalPortalTicket[]
): KnowledgeSuggestion[] {
  const suggestions: KnowledgeSuggestion[] = [];

  for (const ticket of tickets) {
    if (!ticket.plan || ticket.plan.actions.length === 0) {
      continue;
    }

    const unresolvedActions = ticket.plan.actions.filter(
      (action) =>
        !action.status ||
        (typeof action.status === 'string' &&
          !['done', 'completed', 'resolved'].includes(
            action.status.toLowerCase()
          ))
    );

    if (unresolvedActions.length === 0) {
      continue;
    }

    const tagSet = new Set<string>();
    let relatedAgent: string | undefined;

    for (const action of unresolvedActions) {
      switch (action.type) {
        case 'supabase_query':
          tagSet.add('supabase');
          relatedAgent = relatedAgent ?? 'supabase-analyst-agent';
          break;
        case 'hetzner_command':
          tagSet.add('hetzner');
          relatedAgent = relatedAgent ?? 'hetzner-ops-agent';
          break;
        case 'ux_update':
          tagSet.add('frontend');
          relatedAgent = relatedAgent ?? 'frontend-diagnostics-agent';
          break;
        default:
          tagSet.add('generic');
          break;
      }
    }

    if (tagSet.size === 0) {
      continue;
    }

    suggestions.push({
      id: `${ticket.id}-${suggestions.length + 1}`,
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      tags: Array.from(tagSet),
      relatedAgent,
    });
  }

  return suggestions;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function computeBacklogSeries(tickets: InternalPortalTicket[]): BacklogDatum[] {
  const today = startOfDay(new Date());
  const series: BacklogDatum[] = [];

  for (let offset = DAYS_TO_ANALYSE - 1; offset >= 0; offset -= 1) {
    const dayStart = addDays(today, -offset);
    const nextDay = addDays(dayStart, 1);

    const open = tickets.filter((ticket) => {
      const createdAt = new Date(ticket.createdAt);
      const resolvedAt =
        ticket.status === 'resolved' || ticket.status === 'closed'
          ? new Date(ticket.updatedAt)
          : null;

      if (createdAt >= nextDay) {
        return false;
      }
      if (resolvedAt && resolvedAt <= dayStart) {
        return false;
      }
      return true;
    }).length;

    const newTickets = tickets.filter((ticket) => {
      const createdAt = new Date(ticket.createdAt);
      return createdAt >= dayStart && createdAt < nextDay;
    }).length;

    const resolvedTickets = tickets.filter((ticket) => {
      if (!(ticket.status === 'resolved' || ticket.status === 'closed')) {
        return false;
      }
      const resolvedAt = new Date(ticket.updatedAt);
      return resolvedAt >= dayStart && resolvedAt < nextDay;
    }).length;

    const slaRisk = tickets.filter((ticket) => {
      const createdAt = new Date(ticket.createdAt);
      const ageHours = hoursBetween(createdAt, nextDay);
      const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
      const resolvedAt = isResolved ? new Date(ticket.updatedAt) : null;
      const openAtEnd = !isResolved || (resolvedAt ? resolvedAt > nextDay : true);
      return openAtEnd && ageHours >= SLA_THRESHOLD_HOURS;
    }).length;

    series.push({
      date: dayStart.toISOString(),
      open,
      newTickets,
      resolvedTickets,
      slaRisk,
    });
  }

  return series;
}

function computePriorityRisk(tickets: InternalPortalTicket[]): PriorityRisk[] {
  const now = new Date();
  const map = new Map<string, { open: number; aged: number; totalAge: number }>();

  for (const ticket of tickets) {
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      continue;
    }
    const bucket = map.get(ticket.priority) ?? {
      open: 0,
      aged: 0,
      totalAge: 0,
    };
    bucket.open += 1;
    const ageHours = hoursBetween(new Date(ticket.createdAt), now);
    if (ageHours >= SLA_THRESHOLD_HOURS) {
      bucket.aged += 1;
    }
    bucket.totalAge += ageHours;
    map.set(ticket.priority, bucket);
  }

  return Array.from(map.entries()).map(([priority, value]) => ({
    priority,
    open: value.open,
    aged: value.aged,
    avgAgeHours:
      value.open > 0 ? Number((value.totalAge / value.open).toFixed(1)) : 0,
  }));
}

function computeAgentLoad(tickets: InternalPortalTicket[]): AgentLoad[] {
  const loads = new Map<string, { active: number; waiting: number; backlog: number }>();

  for (const ticket of tickets) {
    const agent = ticket.assignedAgent ?? 'unassigned';
    const entry = loads.get(agent) ?? { active: 0, waiting: 0, backlog: 0 };

    if (ticket.status === 'waiting_customer') {
      entry.waiting += 1;
    } else if (ticket.status === 'resolved' || ticket.status === 'closed') {
      // ignore
    } else {
      entry.active += 1;
    }

    entry.backlog = entry.active + entry.waiting;
    loads.set(agent, entry);
  }

  return Array.from(loads.entries())
    .map(([agent, value]) => ({
      agent,
      active: value.active,
      waiting: value.waiting,
      backlog: value.backlog,
    }))
    .sort((a, b) => b.backlog - a.backlog);
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const lower = sorted[middle - 1];
    const upper = sorted[middle];
    if (lower !== undefined && upper !== undefined) {
      return Number(((lower + upper) / 2).toFixed(1));
    }
  }
  const median = sorted[middle];
  return median !== undefined ? Number(median.toFixed(1)) : 0;
}

function computeFirstResponseMinutes(
  tickets: InternalPortalTicket[]
): number | null {
  const durations: number[] = [];

  for (const ticket of tickets) {
    const firstReply = ticket.messages.find(
      (message) =>
        message.authorType !== 'customer' && !message.internalOnly
    );

    if (!firstReply) {
      continue;
    }

    const createdAt = new Date(ticket.createdAt);
    const replyAt = new Date(firstReply.createdAt);
    const minutes = (replyAt.getTime() - createdAt.getTime()) / (1000 * 60);
    if (Number.isFinite(minutes) && minutes >= 0) {
      durations.push(minutes);
    }
  }

  return computeMedian(durations);
}

export async function fetchInternalPortalData(): Promise<InternalPortalData> {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from('support_tickets')
    .select(
      `
        id,
        user_id,
        category,
        priority,
        status,
        title,
        description,
        source_metadata,
        assigned_agent,
        created_at,
        updated_at,
        last_escalation,
        escalation_path,
        support_ticket_messages (
          id,
          ticket_id,
          author_type,
          author_user_id,
          author_name,
          message,
          metadata,
          created_at,
          internal_only,
          quick_reply_options
        ),
        support_automation_events (
          id,
          ticket_id,
          action_type,
          payload,
          created_at
        )
      `
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(
      `[Internal Portal] Tickets konnten nicht geladen werden: ${error.message}`
    );
  }

  const ticketsRaw = (data ?? []) as (SupportTicket & {
    support_ticket_messages: SupportTicketMessage[] | null;
    support_automation_events: SupportAutomationEvent[] | null;
  })[];

  const userIds = Array.from(
    new Set(ticketsRaw.map((ticket) => ticket.user_id).filter(Boolean))
  );

  const profilesMap = new Map<
    string,
    {
      email?: string | null;
      full_name?: string | null;
      company_name?: string | null;
      language?: string | null;
      subscription_tier?: string | null;
      subscription_status?: string | null;
    }
  >();

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, company_name, language, subscription_tier, subscription_status'
      )
      .in('id', userIds);

    if (profilesError) {
      console.warn(
        '[Internal Portal] Profile konnten nicht geladen werden:',
        profilesError.message
      );
    } else {
      for (const profile of profilesData ?? []) {
        profilesMap.set(profile.id, profile);
      }
    }
  }

  const tickets: InternalPortalTicket[] = ticketsRaw.map((ticket) => {
    const messagesRaw = ticket.support_ticket_messages ?? [];
    const automationRaw = ticket.support_automation_events ?? [];

    const messages: InternalMessage[] = messagesRaw
      .map((message) => ({
        id: message.id,
        authorType: message.author_type,
        authorName: message.author_name,
        createdAt: message.created_at,
        message: message.message,
        metadata:
          (message.metadata as Record<string, unknown>) ?? ({} as Record<
            string,
            unknown
          >),
        internalOnly: Boolean(message.internal_only),
        tier: deriveTierFromMessage(message),
        quickReplies: normaliseQuickReplies(message.quick_reply_options),
      }))
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    const automation: AutomationEvent[] = automationRaw
      .map((event) => ({
        id: event.id,
        actionType: event.action_type,
        createdAt: event.created_at,
        payload: (event.payload as Record<string, unknown>) ?? {},
      }))
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    const plan = extractPlanFromMessages(messagesRaw);
    const knowledge = extractKnowledgeFromMessages(messagesRaw);

    const profile = ticket.user_id ? profilesMap.get(ticket.user_id) : null;

    return {
      id: ticket.id,
      userId: ticket.user_id,
      customer: {
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        company: profile?.company_name ?? null,
        language: profile?.language ?? null,
        subscriptionTier: profile?.subscription_tier ?? null,
        subscriptionStatus: profile?.subscription_status ?? null,
      },
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedAgent: ticket.assigned_agent,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      lastEscalation: ticket.last_escalation,
      escalationPath: Array.isArray(ticket.escalation_path)
        ? (ticket.escalation_path as Array<{
            agent: string;
            status: string;
            timestamp: string;
          }>)
        : [],
      messages,
      automation,
      plan,
      knowledge,
    };
  });

  const metrics = computeMetrics(tickets);
  const now = new Date();
  const slaBreaches = tickets.filter((ticket) => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return false;
    }
    const ageHours = hoursBetween(new Date(ticket.createdAt), now);
    return ageHours >= SLA_THRESHOLD_HOURS;
  }).length;
  const insights = {
    backlog: computeBacklogSeries(tickets),
    priorityRisk: computePriorityRisk(tickets),
    agentLoad: computeAgentLoad(tickets),
    slaBreaches,
    medianFirstResponseMinutes: computeFirstResponseMinutes(tickets),
  };
  const knowledgeInventory = accumulateKnowledgeInventory(tickets);
  const suggestions = generateSuggestionsFromTickets(tickets);

  const { data: serviceStatusData, error: serviceStatusError } = await supabase
    .from('support_service_status')
    .select('service_name, status, last_heartbeat, meta');

  if (serviceStatusError) {
    console.warn('[Internal Portal] Service-Status konnte nicht geladen werden:', serviceStatusError.message);
  }

  const services: ServiceStatus[] = (serviceStatusData ?? []).map((row) => ({
    serviceName: row.service_name ?? 'unknown',
    status: row.status ?? 'unknown',
    lastHeartbeat: row.last_heartbeat ?? new Date(0).toISOString(),
    meta: (row.meta as Record<string, unknown>) ?? {},
  }));

  return {
    tickets,
    metrics,
    insights,
    knowledgeInventory,
    suggestions,
    services,
  };
}

