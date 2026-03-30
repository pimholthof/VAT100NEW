"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// ─── CSV parsing ───

function parseCSV(text: string): string[][] {
  const lines = text.trim().split("\n");
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === "," || char === ";") {
          fields.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

// ─── Kolom-detectie ───

const INVOICE_COLUMN_MAP: Record<string, string> = {
  factuurnummer: "invoice_number",
  nummer: "invoice_number",
  invoice_number: "invoice_number",
  klant: "client_name",
  client: "client_name",
  klantnaam: "client_name",
  debiteur: "client_name",
  datum: "issue_date",
  factuurdatum: "issue_date",
  date: "issue_date",
  issue_date: "issue_date",
  vervaldatum: "due_date",
  due_date: "due_date",
  bedrag: "subtotal_ex_vat",
  "bedrag excl": "subtotal_ex_vat",
  "bedrag excl. btw": "subtotal_ex_vat",
  amount: "subtotal_ex_vat",
  subtotal: "subtotal_ex_vat",
  btw: "vat_amount",
  "btw bedrag": "vat_amount",
  vat: "vat_amount",
  totaal: "total_inc_vat",
  "bedrag incl": "total_inc_vat",
  "bedrag incl. btw": "total_inc_vat",
  total: "total_inc_vat",
  omschrijving: "description",
  description: "description",
  status: "status",
};

const RECEIPT_COLUMN_MAP: Record<string, string> = {
  leverancier: "vendor_name",
  vendor: "vendor_name",
  crediteur: "vendor_name",
  naam: "vendor_name",
  bedrag: "amount_ex_vat",
  "bedrag excl": "amount_ex_vat",
  "bedrag excl. btw": "amount_ex_vat",
  amount: "amount_ex_vat",
  btw: "vat_amount",
  "btw bedrag": "vat_amount",
  vat: "vat_amount",
  totaal: "amount_inc_vat",
  "bedrag incl": "amount_inc_vat",
  "bedrag incl. btw": "amount_inc_vat",
  total: "amount_inc_vat",
  datum: "receipt_date",
  date: "receipt_date",
  bondatum: "receipt_date",
  categorie: "category",
  category: "category",
  omschrijving: "vendor_name",
};

function detectColumns(
  headers: string[],
  type: "invoices" | "receipts",
): Record<string, string> {
  const map = type === "invoices" ? INVOICE_COLUMN_MAP : RECEIPT_COLUMN_MAP;
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (map[normalized]) {
      mapping[header] = map[normalized];
    }
  }

  return mapping;
}

// ─── Preview ───

export interface ImportPreview {
  headers: string[];
  mapping: Record<string, string>;
  preview: Record<string, string>[];
  totalRows: number;
}

export async function previewImportCSV(
  csvText: string,
  type: "invoices" | "receipts",
): Promise<ActionResult<ImportPreview>> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return { error: "CSV bevat geen data." };

  const headers = rows[0];
  const mapping = detectColumns(headers, type);
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.length > 0));

  const preview = dataRows.slice(0, 5).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });

  return {
    error: null,
    data: {
      headers,
      mapping,
      preview,
      totalRows: dataRows.length,
    },
  };
}

// ─── Import facturen ───

function parseDate(value: string): string | null {
  if (!value) return null;
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  // Try DD-MM-YYYY or DD/MM/YYYY
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return null;
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  // Handle Dutch number format: 1.234,56
  const cleaned = value.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function importInvoices(
  csvText: string,
  mapping: Record<string, string>,
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const rows = parseCSV(csvText);
  if (rows.length < 2) return { error: "Geen data gevonden." };

  const headers = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.length > 0));

  // Helper to get mapped value
  const getMapped = (row: string[], targetField: string): string => {
    for (const [header, mapped] of Object.entries(mapping)) {
      if (mapped === targetField) {
        const idx = headers.indexOf(header);
        if (idx >= 0) return row[idx] ?? "";
      }
    }
    return "";
  };

  // Get or create a default client for imported invoices
  let defaultClientId: string | null = null;

  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const invoiceNumber = getMapped(row, "invoice_number") || `IMP-${imported + 1}`;
    const issueDate = parseDate(getMapped(row, "issue_date"));
    const subtotal = parseNumber(getMapped(row, "subtotal_ex_vat"));
    const vatAmount = parseNumber(getMapped(row, "vat_amount"));
    const total = parseNumber(getMapped(row, "total_inc_vat"));
    const clientName = getMapped(row, "client_name");

    if (!issueDate || (subtotal === null && total === null)) {
      skipped++;
      continue;
    }

    // Resolve client
    let clientId = defaultClientId;
    if (clientName) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", clientName)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({ user_id: user.id, name: clientName })
          .select("id")
          .single();
        clientId = newClient?.id ?? null;
      }
    }

    if (!clientId) {
      // Create a generic import client
      if (!defaultClientId) {
        const { data: dc } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", "Import")
          .maybeSingle();

        if (dc) {
          defaultClientId = dc.id;
        } else {
          const { data: newDc } = await supabase
            .from("clients")
            .insert({ user_id: user.id, name: "Import" })
            .select("id")
            .single();
          defaultClientId = newDc?.id ?? null;
        }
      }
      clientId = defaultClientId;
    }

    if (!clientId) {
      skipped++;
      continue;
    }

    const computedSubtotal = subtotal ?? (total && vatAmount ? total - vatAmount : total ?? 0);
    const computedVat = vatAmount ?? (total && subtotal ? total - subtotal : 0);
    const computedTotal = total ?? (computedSubtotal + computedVat);

    const { error } = await supabase.from("invoices").insert({
      user_id: user.id,
      client_id: clientId,
      invoice_number: invoiceNumber,
      status: "paid" as const,
      issue_date: issueDate,
      due_date: null,
      subtotal_ex_vat: computedSubtotal,
      vat_rate: computedVat > 0 && computedSubtotal > 0
        ? Math.round((computedVat / computedSubtotal) * 100)
        : 21,
      vat_amount: computedVat,
      total_inc_vat: computedTotal,
      notes: "Geïmporteerd",
    });

    if (error) {
      skipped++;
    } else {
      imported++;
    }
  }

  return { error: null, data: { imported, skipped } };
}

// ─── Import bonnen ───

export async function importReceipts(
  csvText: string,
  mapping: Record<string, string>,
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const rows = parseCSV(csvText);
  if (rows.length < 2) return { error: "Geen data gevonden." };

  const headers = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.length > 0));

  const getMapped = (row: string[], targetField: string): string => {
    for (const [header, mapped] of Object.entries(mapping)) {
      if (mapped === targetField) {
        const idx = headers.indexOf(header);
        if (idx >= 0) return row[idx] ?? "";
      }
    }
    return "";
  };

  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const vendorName = getMapped(row, "vendor_name") || "Onbekend";
    const receiptDate = parseDate(getMapped(row, "receipt_date"));
    const amountExVat = parseNumber(getMapped(row, "amount_ex_vat"));
    const vatAmount = parseNumber(getMapped(row, "vat_amount"));
    const amountIncVat = parseNumber(getMapped(row, "amount_inc_vat"));

    if (!receiptDate || (amountExVat === null && amountIncVat === null)) {
      skipped++;
      continue;
    }

    const computedExVat = amountExVat ?? (amountIncVat && vatAmount ? amountIncVat - vatAmount : amountIncVat ?? 0);
    const computedVat = vatAmount ?? (amountIncVat && amountExVat ? amountIncVat - amountExVat : 0);
    const computedIncVat = amountIncVat ?? (computedExVat + computedVat);

    const { error } = await supabase.from("receipts").insert({
      user_id: user.id,
      vendor_name: vendorName,
      amount_ex_vat: computedExVat,
      vat_amount: computedVat,
      amount_inc_vat: computedIncVat,
      vat_rate: computedVat > 0 && computedExVat > 0
        ? Math.round((computedVat / computedExVat) * 100)
        : 21,
      receipt_date: receiptDate,
      category: getMapped(row, "category") || null,
    });

    if (error) {
      skipped++;
    } else {
      imported++;
    }
  }

  return { error: null, data: { imported, skipped } };
}
