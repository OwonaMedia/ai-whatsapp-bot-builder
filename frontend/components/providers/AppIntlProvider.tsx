'use client';

import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import type { ReactNode } from 'react';

type AppIntlProviderProps = {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
};

export default function AppIntlProvider({ locale, messages, children }: AppIntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === 'MISSING_MESSAGE') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[next-intl] Missing message: ${error.message}`);
          }
        } else if (error.code === 'INSUFFICIENT_PATH') {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[next-intl] Insufficient path: ${error.message}`);
          }
        } else {
          throw error;
        }
      }}
      getMessageFallback={({ namespace, key, error }) => {
        const path = [namespace, key].filter(Boolean).join('.');
        if (error.code === 'MISSING_MESSAGE') {
          return `MISSING_MESSAGE: ${path}`;
        }
        return `ERROR: ${path}`;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}

