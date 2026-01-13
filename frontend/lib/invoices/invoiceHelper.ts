/**
 * Invoice Helper
 * Hilfsfunktionen für Rechnungserstellung nach Zahlungen
 */

import { createInvoice, InvoiceData, InvoiceItem } from './invoiceGenerator';

export interface PaymentInvoiceData {
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  description: string;
  paymentProvider: 'stripe' | 'paypal';
  paymentProviderId: string;
  customerEmail?: string;
  customerName?: string;
  locale?: string;
}

/**
 * Erstellt eine Rechnung aus Payment-Daten
 */
export async function createInvoiceFromPayment(
  paymentData: PaymentInvoiceData
): Promise<{
  invoiceId: string;
  invoiceNumber: string;
  pdfPath: string;
  pdfUrl: string;
}> {
  // Bereite Rechnungspositionen vor
  const items: InvoiceItem[] = [
    {
      description: paymentData.description,
      quantity: 1,
      unitPrice: paymentData.amount,
      total: paymentData.amount,
    },
  ];

  // Bereite Invoice-Daten vor
  const invoiceData: InvoiceData = {
    userId: paymentData.userId,
    subscriptionId: paymentData.subscriptionId,
    amountNet: paymentData.amount, // Kleinunternehmer: Netto = Brutto
    amountGross: paymentData.amount,
    currency: paymentData.currency,
    description: paymentData.description,
    items,
    paymentProvider: paymentData.paymentProvider,
    paymentProviderId: paymentData.paymentProviderId,
    customerData: {
      name: paymentData.customerName,
      email: paymentData.customerEmail,
    },
    locale: paymentData.locale || 'de',
  };

  // Erstelle Rechnung
  return await createInvoice(invoiceData);
}

