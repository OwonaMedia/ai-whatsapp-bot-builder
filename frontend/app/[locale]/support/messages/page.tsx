export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { redirect } from 'next/navigation';
import SupportMessagesClient from './SupportMessagesClient';
import { createServerSupabaseClient } from '@/lib/supabase';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SupportMessagesPage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/support/messages`);
  }

  return <SupportMessagesClient />;
}


