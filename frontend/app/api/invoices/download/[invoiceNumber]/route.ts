/**
 * GET /api/invoices/download/[invoiceNumber]
 * Download-Rechnung als PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    
    // User-Authentifizierung
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hole Rechnung aus Datenbank
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Prüfe ob PDF existiert
    if (!invoice.pdf_path) {
      return NextResponse.json(
        { error: 'PDF not available' },
        { status: 404 }
      );
    }

    // Lese PDF-Datei
    if (!fs.existsSync(invoice.pdf_path)) {
      return NextResponse.json(
        { error: 'PDF file not found on server' },
        { status: 404 }
      );
    }

    const pdfBuffer = fs.readFileSync(invoice.pdf_path);

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Invoice Download] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download invoice', message: error.message },
      { status: 500 }
    );
  }
}

