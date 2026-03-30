"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Client } from "@/lib/types";

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

const CLIENT_COLUMN_MAP: Record<string, string> = {
  naam: "name",
  bedrijfsnaam: "name",
  company: "name",
  klant: "name",
  klantnaam: "name",
  name: "name",
  contactpersoon: "contact_name",
  contact: "contact_name",
  contact_name: "contact_name",
  email: "email",
  "e-mail": "email",
  mail: "email",
  adres: "address",
  straat: "address",
  address: "address",
  stad: "city",
  plaats: "city",
  city: "city",
  postcode: "postal_code",
  postal_code: "postal_code",
  kvk: "kvk_number",
  "kvk-nummer": "kvk_number",
  kvk_number: "kvk_number",
  kvknummer: "kvk_number",
  btw: "btw_number",
  "btw-nummer": "btw_number",
  btw_number: "btw_number",
  btwnummer: "btw_number",
};

function detectColumns(
  headers: string[],
  type: "invoices" | "receipts" | "clients" | "bank",
): Record<string, string> {
  const maps: Record<string, Record<string, string>> = {
    invoices: INVOICE_COLUMN_MAP,
    receipts: RECEIPT_COLUMN_MAP,
    clients: CLIENT_COLUMN_MAP,
    bank: BANK_COLUMN_MAP,
  };
  const map = maps[type] ?? INVOICE_COLUMN_MAP;
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

// ─── Klanten import ───

export async function previewImportClients(
  csvText: string,
): Promise<ActionResult<ImportPreview>> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return { error: "CSV bevat geen data." };

  const headers = rows[0];
  const mapping = detectColumns(headers, "clients");
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
    data: { headers, mapping, preview, totalRows: dataRows.length },
  };
}

export interface DuplicateMatch {
  rowIndex: number;
  csvRow: Record<string, string>;
  existingClient: Pick<Client, "id" | "name" | "email" | "kvk_number" | "btw_number">;
  matchField: "name" | "kvk_number" | "btw_number";
}

export async function detectClientDuplicates(
  csvText: string,
  mapping: Record<string, string>,
): Promise<ActionResult<{ duplicates: DuplicateMatch[]; totalRows: number }>> {
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

  // Fetch all existing clients for comparison
  const { data: existingClients } = await supabase
    .from("clients")
    .select("id, name, email, kvk_number, btw_number")
    .eq("user_id", user.id);

  const clients = existingClients ?? [];
  const duplicates: DuplicateMatch[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const name = getMapped(row, "name");
    const kvk = getMapped(row, "kvk_number");
    const btw = getMapped(row, "btw_number");

    const csvRow: Record<string, string> = {};
    headers.forEach((h, idx) => { csvRow[h] = row[idx] ?? ""; });

    // Check for duplicates: KVK first (most specific), then BTW, then name
    let match: DuplicateMatch | null = null;

    if (kvk) {
      const found = clients.find((c) => c.kvk_number && c.kvk_number.toLowerCase() === kvk.toLowerCase());
      if (found) match = { rowIndex: i, csvRow, existingClient: found, matchField: "kvk_number" };
    }

    if (!match && btw) {
      const found = clients.find((c) => c.btw_number && c.btw_number.toLowerCase() === btw.toLowerCase());
      if (found) match = { rowIndex: i, csvRow, existingClient: found, matchField: "btw_number" };
    }

    if (!match && name) {
      const found = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (found) match = { rowIndex: i, csvRow, existingClient: found, matchField: "name" };
    }

    if (match) duplicates.push(match);
  }

  return { error: null, data: { duplicates, totalRows: dataRows.length } };
}

export async function importClients(
  csvText: string,
  mapping: Record<string, string>,
  duplicateStrategy: "skip" | "merge" | "create",
): Promise<ActionResult<{ imported: number; updated: number; skipped: number }>> {
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

  // Fetch existing clients for duplicate detection
  const { data: existingClients } = await supabase
    .from("clients")
    .select("id, name, kvk_number, btw_number")
    .eq("user_id", user.id);

  const clients = existingClients ?? [];

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const name = getMapped(row, "name");
    if (!name) { skipped++; continue; }

    const contactName = getMapped(row, "contact_name") || null;
    const email = getMapped(row, "email") || null;
    const address = getMapped(row, "address") || null;
    const city = getMapped(row, "city") || null;
    const postalCode = getMapped(row, "postal_code") || null;
    const kvkNumber = getMapped(row, "kvk_number") || null;
    const btwNumber = getMapped(row, "btw_number") || null;

    // Find duplicate
    let existing: typeof clients[number] | undefined;
    if (kvkNumber) existing = clients.find((c) => c.kvk_number && c.kvk_number.toLowerCase() === kvkNumber.toLowerCase());
    if (!existing && btwNumber) existing = clients.find((c) => c.btw_number && c.btw_number.toLowerCase() === btwNumber.toLowerCase());
    if (!existing) existing = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      if (duplicateStrategy === "skip") {
        skipped++;
        continue;
      }

      if (duplicateStrategy === "merge") {
        const updates: Record<string, string> = {};
        if (contactName) updates.contact_name = contactName;
        if (email) updates.email = email;
        if (address) updates.address = address;
        if (city) updates.city = city;
        if (postalCode) updates.postal_code = postalCode;
        if (kvkNumber) updates.kvk_number = kvkNumber;
        if (btwNumber) updates.btw_number = btwNumber;

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from("clients")
            .update(updates)
            .eq("id", existing.id);
          if (!error) updated++;
          else skipped++;
        } else {
          skipped++;
        }
        continue;
      }
    }

    const { error: insertError, data: newClient } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name,
        contact_name: contactName,
        email,
        address,
        city,
        postal_code: postalCode,
        kvk_number: kvkNumber,
        btw_number: btwNumber,
      })
      .select("id, name, kvk_number, btw_number")
      .single();

    if (insertError) {
      skipped++;
    } else {
      imported++;
      if (newClient) clients.push(newClient);
    }
  }

  return { error: null, data: { imported, updated, skipped } };
}

// ─── Banktransacties import ───

const BANK_COLUMN_MAP: Record<string, string> = {
  // Datum
  datum: "booking_date",
  date: "booking_date",
  boekdatum: "booking_date",
  boekingsdatum: "booking_date",
  booking_date: "booking_date",
  transactiedatum: "booking_date",
  // Bedrag
  bedrag: "amount",
  amount: "amount",
  "bedrag (eur)": "amount",
  // Omschrijving
  omschrijving: "description",
  description: "description",
  mededeling: "description",
  "naam / omschrijving": "description",
  mededelingen: "description",
  // Tegenpartij
  tegenpartij: "counterpart_name",
  naam: "counterpart_name",
  name: "counterpart_name",
  "naam/omschrijving": "counterpart_name",
  tegenrekening: "counterpart_name",
  // Tegenrekening IBAN
  "tegenrekening iban": "counterpart_iban",
  iban: "counterpart_iban",
  "rekening tegenpartij": "counterpart_iban",
  // Valuta
  valuta: "currency",
  currency: "currency",
  munt: "currency",
  // Af/Bij indicator (ING-style)
  "af bij": "direction",
  "af/bij": "direction",
  afbij: "direction",
};

export async function previewImportBankCSV(
  csvText: string,
): Promise<ActionResult<ImportPreview>> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return { error: "CSV bevat geen data." };

  const headers = rows[0];
  const mapping = detectColumns(headers, "bank");
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
    data: { headers, mapping, preview, totalRows: dataRows.length },
  };
}

export async function importBankTransactions(
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
    const bookingDate = parseDate(getMapped(row, "booking_date"));
    let amount = parseNumber(getMapped(row, "amount"));
    const description = getMapped(row, "description") || null;
    const counterpartName = getMapped(row, "counterpart_name") || null;
    const currency = getMapped(row, "currency") || "EUR";

    if (!bookingDate || amount === null) {
      skipped++;
      continue;
    }

    // Handle "Af/Bij" direction indicator (ING, Rabobank style)
    const direction = getMapped(row, "direction").toLowerCase().trim();
    if (direction === "af" && amount > 0) {
      amount = -amount;
    } else if (direction === "bij" && amount < 0) {
      amount = -amount;
    }

    // Generate a deterministic external_id for deduplication
    const rawKey = `${bookingDate}|${amount}|${description ?? ""}|${counterpartName ?? ""}`;
    const externalId = `csv-${simpleHash(rawKey)}`;

    const isIncome = amount > 0;

    const { error } = await supabase
      .from("bank_transactions")
      .upsert(
        {
          user_id: user.id,
          bank_connection_id: null,
          external_id: externalId,
          booking_date: bookingDate,
          amount,
          currency: currency.toUpperCase(),
          description,
          counterpart_name: counterpartName,
          is_income: isIncome,
          source: "csv" as const,
        },
        { onConflict: "user_id,external_id" }
      );

    if (error) {
      skipped++;
    } else {
      imported++;
    }
  }

  return { error: null, data: { imported, skipped } };
}

/** Simple string hash for generating deterministic external IDs */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ─── Historische kostensamenvatting ───

export async function importHistoricalCostSummary(
  year: number,
  costs: Array<{ category: string; cost_code: number; amount_ex_vat: number; vat_amount: number }>,
): Promise<ActionResult<{ imported: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!Number.isInteger(year) || year < 2015 || year > new Date().getFullYear()) {
    return { error: "Ongeldig jaar." };
  }

  let imported = 0;

  for (const cost of costs) {
    if (cost.amount_ex_vat <= 0) continue;

    const { error } = await supabase.from("receipts").insert({
      user_id: user.id,
      vendor_name: `Samenvatting ${cost.category} ${year}`,
      amount_ex_vat: cost.amount_ex_vat,
      vat_amount: cost.vat_amount,
      amount_inc_vat: cost.amount_ex_vat + cost.vat_amount,
      vat_rate: cost.amount_ex_vat > 0 ? Math.round((cost.vat_amount / cost.amount_ex_vat) * 100) : 21,
      receipt_date: `${year}-12-31`,
      category: cost.category,
      cost_code: cost.cost_code,
    });

    if (!error) imported++;
  }

  return { error: null, data: { imported } };
}
