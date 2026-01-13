/**
 * GET /api/invoices
 * Liste aller Rechnungen des Users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // User-Authentifizierung
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hole alle Rechnungen des Users
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, amount_gross, currency, status, pdf_url, locale, created_at')
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false })
      .order('invoice_number', { ascending: false });

    if (invoicesError) {
      return NextResponse.json(
        { error: 'Failed to fetch invoices', message: invoicesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices || [],
      },
    });
  } catch (error: any) {
    console.error('[Invoices API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', message: error.message },
      { status: 500 }
    );
  }
}

