"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/supabase/server";
import { modelFor } from "@/lib/ai/models";
import type { ActionResult } from "@/lib/types";
import {
  parseCSV,
  detectColumns,
  parseDate,
  parseNumber,
  TARGET_FIELDS,
  type ImportType,
  type ImportPreview,
} from "./parse";

// ─── Preview ───

export async function previewImportCSV(
  csvText: string,
  type: ImportType,
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
    data: { headers, mapping, preview, totalRows: dataRows.length },
  };
}

/** Lees de waarde van het eerste kolom dat op `targetField` is afgebeeld. */
function makeGetMapped(headers: string[], mapping: Record<string, string>) {
  return (row: string[], targetField: string): string => {
    for (const [header, mapped] of Object.entries(mapping)) {
      if (mapped === targetField) {
        const idx = headers.indexOf(header);
        if (idx >= 0) return (row[idx] ?? "").trim();
      }
    }
    return "";
  };
}

// ─── Import facturen ───

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
  const getMapped = makeGetMapped(headers, mapping);

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
  const getMapped = makeGetMapped(headers, mapping);

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

// ─── Import klanten ───

export async function importClients(
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
  const getMapped = makeGetMapped(headers, mapping);

  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const name = getMapped(row, "name");
    if (!name) {
      skipped++;
      continue;
    }

    const email = getMapped(row, "email");

    // Dedup: bestaat er al een klant met dit e-mailadres (of, zonder e-mail,
    // met dezelfde naam)? Zo ja, overslaan — geen dubbelen aanmaken.
    const dupBase = supabase.from("clients").select("id").eq("user_id", user.id);
    const { data: dupes } = await (email
      ? dupBase.ilike("email", email)
      : dupBase.ilike("name", name)
    ).limit(1);
    if (dupes && dupes.length > 0) {
      skipped++;
      continue;
    }

    const record: Record<string, unknown> = { user_id: user.id, name };
    const contactName = getMapped(row, "contact_name");
    const address = getMapped(row, "address");
    const postalCode = getMapped(row, "postal_code");
    const city = getMapped(row, "city");
    const country = getMapped(row, "country");
    const kvk = getMapped(row, "kvk_number");
    const btw = getMapped(row, "btw_number");
    const paymentTerms = parseNumber(getMapped(row, "payment_terms_days"));
    if (email) record.email = email;
    if (contactName) record.contact_name = contactName;
    if (address) record.address = address;
    if (postalCode) record.postal_code = postalCode;
    if (city) record.city = city;
    if (country) record.country = country;
    if (kvk) record.kvk_number = kvk;
    if (btw) record.btw_number = btw;
    if (paymentTerms !== null) record.payment_terms_days = Math.round(paymentTerms);

    const { error } = await supabase.from("clients").insert(record);
    if (error) {
      skipped++;
    } else {
      imported++;
    }
  }

  return { error: null, data: { imported, skipped } };
}

// ─── Slimme kolom-herkenning (onder de motorkap) ───

/**
 * Stelt een kolom-mapping voor wanneer de standaard-detectie kolommen mist —
 * handig bij onbekende of Engelstalige exports. Werkt stil onder de motorkap
 * (zelfde subverwerker als de bon-scan); faalt netjes terug op handmatig
 * mappen als de dienst niet beschikbaar is.
 */
export async function suggestColumnMapping(
  headers: string[],
  type: ImportType,
  sampleRows: string[][],
): Promise<ActionResult<Record<string, string>>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Automatisch herkennen is nu niet beschikbaar. Map de kolommen handmatig." };
  }
  if (headers.length === 0) return { error: "Geen kolommen gevonden." };

  const fields = TARGET_FIELDS[type];

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const fieldList = fields.map((f) => `- ${f.field}: ${f.desc}`).join("\n");
    const sample = [headers, ...sampleRows.slice(0, 3)]
      .map((r) => r.join(" | "))
      .join("\n");

    const systemPrompt = `Je koppelt kolomkoppen uit een CSV-export (Moneybird, e-Boekhouden, Excel) aan vaste doelvelden.
Retourneer UITSLUITEND valide JSON — geen markdown, geen toelichting: een object dat élke kolomkop afbeeldt op een doelveld of op null.
Doelvelden:
${fieldList}
Regels:
- Gebruik alleen de exacte doelveld-namen hierboven, of null als geen veld past.
- Eén doelveld hooguit één keer; kies bij twijfel de best passende kolom.
- Baseer je op de kolomkop én de voorbeeldwaarden.`;

    const userText = `Kolommen en voorbeeldrijen (eerste rij = koppen):
${sample}

Geef JSON met een sleutel voor elke kolomkop: {"<kolomkop>":"<doelveld of null>", ...}`;

    const response = await anthropic.messages.create({
      model: modelFor("CLASSIFIER"),
      max_tokens: 512,
      system: [{ type: "text", text: systemPrompt }],
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return { error: "Kon de kolommen niet automatisch herkennen." };
    }

    const cleaned = textContent.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const raw: unknown = JSON.parse(cleaned);
    const parsed = z.record(z.string(), z.string().nullable()).safeParse(raw);
    if (!parsed.success) {
      return { error: "Kon de kolommen niet automatisch herkennen." };
    }

    const allowed = new Set(fields.map((f) => f.field));
    const mapping: Record<string, string> = {};
    const used = new Set<string>();
    for (const header of headers) {
      const suggestion = parsed.data[header];
      if (suggestion && allowed.has(suggestion) && !used.has(suggestion)) {
        mapping[header] = suggestion;
        used.add(suggestion);
      }
    }
    return { error: null, data: mapping };
  } catch {
    return { error: "Kon de kolommen niet automatisch herkennen. Map ze handmatig." };
  }
}
