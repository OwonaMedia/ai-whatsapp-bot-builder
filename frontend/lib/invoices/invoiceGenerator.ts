/**
 * Invoice Generator
 * Erstellt PDF-Rechnungen nach erfolgreichen Zahlungen
 */

import { createServiceRoleClient } from '@/lib/supabase';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

// Supabase Admin Client
function getSupabaseAdminClient() {
  return createServiceRoleClient();
}

// Firmeninformationen (Kleinunternehmer)
const COMPANY_DATA = {
  name: process.env.COMPANY_NAME || 'OWONA Digital Solutions',
  address: {
    street: process.env.COMPANY_STREET || 'Musterstraße 123',
    city: process.env.COMPANY_CITY || 'Berlin',
    zip: process.env.COMPANY_ZIP || '10115',
    country: process.env.COMPANY_COUNTRY || 'Deutschland',
  },
  taxId: process.env.COMPANY_TAX_ID || '', // Optional für Kleinunternehmer
  email: process.env.COMPANY_EMAIL || 'info@owona.de',
  phone: process.env.COMPANY_PHONE || '+49 30 12345678',
  website: process.env.COMPANY_WEBSITE || 'https://whatsapp.owona.de',
  isSmallBusiness: true, // Kleinunternehmer-Regelung
  taxExempt: true, // Keine Umsatzsteuer ausgewiesen
};

// Rechnungstexte (mehrsprachig)
const INVOICE_TEXTS: Record<string, Record<string, string>> = {
  de: {
    invoice: 'Rechnung',
    invoiceNumber: 'Rechnungsnummer',
    invoiceDate: 'Rechnungsdatum',
    dueDate: 'Fälligkeitsdatum',
    paymentDate: 'Zahlungsdatum',
    customer: 'Rechnungsempfänger',
    item: 'Position',
    description: 'Beschreibung',
    quantity: 'Menge',
    unitPrice: 'Einzelpreis',
    total: 'Gesamt',
    subtotal: 'Zwischensumme',
    tax: 'MwSt.',
    totalAmount: 'Gesamtbetrag',
    paid: 'Bezahlt',
    smallBusinessNote: 'Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen.',
    thankYou: 'Vielen Dank für Ihren Einkauf!',
    paymentMethod: 'Zahlungsmethode',
    paymentStatus: 'Zahlungsstatus',
  },
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice Number',
    invoiceDate: 'Invoice Date',
    dueDate: 'Due Date',
    paymentDate: 'Payment Date',
    customer: 'Bill To',
    item: 'Item',
    description: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'VAT',
    totalAmount: 'Total Amount',
    paid: 'Paid',
    smallBusinessNote: 'According to §19 UStG, no VAT is shown.',
    thankYou: 'Thank you for your purchase!',
    paymentMethod: 'Payment Method',
    paymentStatus: 'Payment Status',
  },
  fr: {
    invoice: 'Facture',
    invoiceNumber: 'Numéro de facture',
    invoiceDate: 'Date de facturation',
    dueDate: 'Date d\'échéance',
    paymentDate: 'Date de paiement',
    customer: 'Facturé à',
    item: 'Article',
    description: 'Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'TVA',
    totalAmount: 'Montant total',
    paid: 'Payé',
    smallBusinessNote: 'Selon §19 UStG, aucune TVA n\'est indiquée.',
    thankYou: 'Merci pour votre achat !',
    paymentMethod: 'Méthode de paiement',
    paymentStatus: 'Statut du paiement',
  },
};

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  userId: string;
  subscriptionId?: string;
  amountNet: number;
  amountGross: number;
  currency: string;
  description: string;
  items: InvoiceItem[];
  paymentProvider: 'stripe' | 'paypal';
  paymentProviderId: string;
  customerData: {
    name?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      zip?: string;
      country?: string;
    };
  };
  locale?: string;
}

/**
 * Erstellt eine PDF-Rechnung
 */
export async function generateInvoicePDF(
  invoiceData: InvoiceData,
  invoiceNumber: string,
  invoiceDate: Date
): Promise<Buffer> {
  const locale = invoiceData.locale || 'de';
  const texts = (INVOICE_TEXTS[locale] || INVOICE_TEXTS.de) as Record<string, string>;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text(texts.invoice || 'Invoice', { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(invoiceNumber, { align: 'right' });
      doc.moveDown(2);

      // Firmeninformationen
      doc.fontSize(14).text(COMPANY_DATA.name, { continued: false });
      doc.fontSize(10);
      doc.text(COMPANY_DATA.address.street || '');
      doc.text(`${COMPANY_DATA.address.zip || ''} ${COMPANY_DATA.address.city || ''}`.trim() || '');
      doc.text(COMPANY_DATA.address.country || '');
      doc.moveDown(1);

      // Rechnungsempfänger
      doc.fontSize(12).text(texts.customer || 'Customer', { underline: true });
      doc.fontSize(10);
      if (invoiceData.customerData.name) {
        doc.text(invoiceData.customerData.name || '');
      }
      if (invoiceData.customerData.email) {
        doc.text(invoiceData.customerData.email || '');
      }
      if (invoiceData.customerData.address) {
        const addr = invoiceData.customerData.address;
        if (addr.street) doc.text(addr.street || '');
        if (addr.zip || addr.city) {
          doc.text(`${addr.zip || ''} ${addr.city || ''}`.trim());
        }
        if (addr.country) doc.text(addr.country || '');
      }
      doc.moveDown(2);

      // Rechnungsdetails
      doc.fontSize(10);
      doc.text(`${texts.invoiceDate || 'Invoice Date'}: ${invoiceDate.toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'en-US')}`, { continued: false });
      doc.text(`${texts.paymentStatus || 'Payment Status'}: ${texts.paid || 'Paid'}`, { continued: false });
      doc.text(`${texts.paymentMethod || 'Payment Method'}: ${invoiceData.paymentProvider.toUpperCase()}`, { continued: false });
      doc.moveDown(1);

      // Rechnungspositionen
      doc.fontSize(12).text(texts.item || 'Item', { underline: true });
      doc.moveDown(0.5);

      // Tabelle Header
      doc.fontSize(10);
      doc.text(texts.description || 'Description', 50, doc.y, { width: 250, continued: true });
      doc.text(texts.quantity || 'Quantity', 300, doc.y, { width: 60, continued: true, align: 'right' });
      doc.text(texts.unitPrice || 'Unit Price', 360, doc.y, { width: 80, continued: true, align: 'right' });
      doc.text(texts.total || 'Total', 440, doc.y, { width: 100, align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(0.5);

      // Rechnungspositionen
      invoiceData.items.forEach((item) => {
        const startY = doc.y;
        doc.text(item.description, 50, startY, { width: 250 });
        doc.text(item.quantity.toString(), 300, startY, { width: 60, align: 'right' });
        doc.text(
          `${item.unitPrice.toFixed(2)} ${invoiceData.currency}`,
          360,
          startY,
          { width: 80, align: 'right' }
        );
        doc.text(
          `${item.total.toFixed(2)} ${invoiceData.currency}`,
          440,
          startY,
          { width: 100, align: 'right' }
        );
        doc.moveDown(1);
      });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(1);

      // Gesamtbetrag
      doc.fontSize(12);
      doc.text(
        `${texts.totalAmount || 'Total Amount'}: ${invoiceData.amountGross.toFixed(2)} ${invoiceData.currency}`,
        440,
        doc.y,
        { width: 100, align: 'right' }
      );

      // Kleinunternehmer-Hinweis
      if (COMPANY_DATA.isSmallBusiness) {
        doc.moveDown(2);
        doc.fontSize(9).text(texts.smallBusinessNote || 'Small Business Note', { align: 'center' });
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(10).text(texts.thankYou || 'Thank You', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(8).text(
        `${COMPANY_DATA.name || ''} | ${COMPANY_DATA.email || ''} | ${COMPANY_DATA.website || ''}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Speichert PDF auf dem Server
 */
export async function saveInvoicePDF(
  pdfBuffer: Buffer,
  invoiceNumber: string
): Promise<{ path: string; url: string }> {
  const invoicesDir = process.env.INVOICES_DIR || '/var/www/whatsapp-bot-builder/invoices';
  
  // Erstelle Verzeichnis falls nicht vorhanden
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const fileName = `invoice_${invoiceNumber.replace(/-/g, '_')}.pdf`;
  const filePath = path.join(invoicesDir, fileName);
  
  fs.writeFileSync(filePath, pdfBuffer);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de';
  const url = `${baseUrl}/api/invoices/download/${invoiceNumber}`;

  return { path: filePath, url };
}

/**
 * Erstellt eine vollständige Rechnung (Datenbank + PDF)
 */
export async function createInvoice(invoiceData: InvoiceData): Promise<{
  invoiceId: string;
  invoiceNumber: string;
  pdfPath: string;
  pdfUrl: string;
}> {
  const supabase = getSupabaseAdminClient();

  try {
    // Hole User-Daten für customer_data
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      invoiceData.userId
    );

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    const customerData = {
      name: invoiceData.customerData.name || userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0],
      email: invoiceData.customerData.email || userData.user.email || '',
      address: invoiceData.customerData.address || {},
    };

    // Erstelle Rechnung in Datenbank
    const { data: invoice, error: invoiceError } = await supabase.rpc('create_invoice', {
      p_user_id: invoiceData.userId,
      p_subscription_id: invoiceData.subscriptionId || null,
      p_amount_net: invoiceData.amountNet,
      p_amount_gross: invoiceData.amountGross,
      p_currency: invoiceData.currency,
      p_description: invoiceData.description,
      p_items: invoiceData.items,
      p_payment_provider: invoiceData.paymentProvider,
      p_payment_provider_id: invoiceData.paymentProviderId,
      p_customer_data: customerData,
      p_company_data: COMPANY_DATA,
      p_locale: invoiceData.locale || 'de',
      p_is_small_business: COMPANY_DATA.isSmallBusiness,
    });

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    // Hole Rechnungsnummer
    const { data: invoiceRecord, error: fetchError } = await supabase
      .from('invoices')
      .select('invoice_number, invoice_date')
      .eq('id', invoice)
      .single();

    if (fetchError || !invoiceRecord) {
      throw new Error(`Failed to fetch invoice: ${fetchError?.message}`);
    }

    const invoiceNumber = invoiceRecord.invoice_number;
    const invoiceDate = new Date(invoiceRecord.invoice_date);

    // Generiere PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData, invoiceNumber, invoiceDate);

    // Speichere PDF
    const { path: pdfPath, url: pdfUrl } = await saveInvoicePDF(pdfBuffer, invoiceNumber);

    // Aktualisiere Rechnung mit PDF-Pfad
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        pdf_path: pdfPath,
        pdf_url: pdfUrl,
        payment_date: new Date().toISOString(),
      })
      .eq('id', invoice);

    if (updateError) {
      console.error('[Invoice] Failed to update PDF path:', updateError);
      // Nicht kritisch, Rechnung wurde erstellt
    }

    return {
      invoiceId: invoice,
      invoiceNumber,
      pdfPath,
      pdfUrl,
    };
  } catch (error: any) {
    console.error('[Invoice] Error creating invoice:', error);
    throw error;
  }
}

