import type { InvoiceUnit, VatRate, VatScheme } from "@/lib/types";

export interface InvoiceOCRData {
  // Client info
  client_name: string | null;
  client_address: string | null;
  client_city: string | null;
  client_postal_code: string | null;
  client_kvk_number: string | null;
  client_btw_number: string | null;
  client_email: string | null;

  // Invoice metadata
  invoice_number: string | null;
  issue_date: string | null; // YYYY-MM-DD
  due_date: string | null; // YYYY-MM-DD

  // Amounts
  subtotal_ex_vat: number | null;
  vat_rate: VatRate;
  vat_amount: number | null;
  total_inc_vat: number | null;

  // Line items
  lines: Array<{
    description: string;
    quantity: number;
    unit: InvoiceUnit;
    rate: number;
  }>;

  // Meta
  confidence: number; // 0.0 - 1.0
  vat_scheme: VatScheme;
  /**
   * True wanneer confidence < OCR_REVIEW_THRESHOLD.
   * UI moet expliciet om handmatige bevestiging vragen voordat
   * de factuur wordt opgeslagen of de aangifte raakt.
   */
  requires_review: boolean;
}

/**
 * Onder deze drempel vragen we de gebruiker om handmatig te
 * controleren voordat we de OCR-data accepteren als bron voor
 * fiscale berekeningen.
 */
export const OCR_REVIEW_THRESHOLD = 0.85;

export interface ExtractedClientData {
  name: string;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  kvk_number?: string | null;
  btw_number?: string | null;
  email?: string | null;
}
