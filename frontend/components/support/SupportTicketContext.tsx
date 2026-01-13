'use client';

import { createContext, useContext } from 'react';

export interface SupportTicketMetadata {
  context?: string;
  referenceId?: string;
  extra?: Record<string, any>;
}

export interface SupportTicketContextValue {
  isOpen: boolean;
  metadata?: SupportTicketMetadata;
  openTicket: (metadata?: SupportTicketMetadata) => Promise<void> | void;
  closeTicket: () => void;
}

export const SupportTicketContext = createContext<SupportTicketContextValue | undefined>(undefined);

export function useSupportTicket(): SupportTicketContextValue {
  const context = useContext(SupportTicketContext);
  if (!context) {
    throw new Error('useSupportTicket must be used within a SupportTicketProvider');
  }
  return context;
}


