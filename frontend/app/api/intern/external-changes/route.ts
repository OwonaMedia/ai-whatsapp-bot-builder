import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * External Changes API
 * Returns external API/provider changes detected by monitoring system
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get external changes from database
    // Note: This table needs to be created by the monitoring system
    const { data: changes, error: changesError } = await supabase
      .from('external_api_changes')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(100);

    if (changesError && changesError.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist yet, which is OK
      console.error('Error fetching external changes:', changesError);
    }

    // Get provider statuses
    const providers = [
      'Meta/WhatsApp',
      'Stripe',
      'PayPal',
      'Mollie',
      'Hetzner',
      'n8n',
      'Supabase',
    ];

    const providerStatuses = await Promise.all(
      providers.map(async (provider) => {
        const providerChanges = (changes || []).filter((c: any) => c.provider === provider);
        const lastChange = providerChanges.length > 0 ? providerChanges[0].detected_at : null;
        
        // Determine status based on recent changes
        let status: 'ok' | 'warning' | 'error' = 'ok';
        const recentCritical = providerChanges.filter(
          (c: any) =>
            c.impact === 'critical' &&
            new Date(c.detected_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );
        const recentHigh = providerChanges.filter(
          (c: any) =>
            c.impact === 'high' &&
            new Date(c.detected_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        if (recentCritical.length > 0) {
          status = 'error';
        } else if (recentHigh.length > 0) {
          status = 'warning';
        }

        return {
          provider,
          status,
          lastChange: lastChange || undefined,
          lastChecked: new Date().toISOString(),
          changesCount: providerChanges.length,
        };
      })
    );

    return NextResponse.json({
      changes: changes || [],
      providerStatuses,
    });
  } catch (error) {
    console.error('Error in external changes API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch external changes',
        message: error instanceof Error ? error.message : 'Unknown error',
        changes: [],
        providerStatuses: [],
      },
      { status: 500 }
    );
  }
}

