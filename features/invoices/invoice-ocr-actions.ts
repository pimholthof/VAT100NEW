"use server";

import { z } from "zod";
import { sanitizeSupabaseError } from "@/lib/errors";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult, ClientInput, VatRate, VatScheme, InvoiceUnit } from "@/lib/types";
import type { InvoiceOCRData, ExtractedClientData } from "./types/invoice-ocr";

// ─── Upload Invoice File ───

export async function uploadInvoiceFile(
  formData: FormData
): Promise<ActionResult<string>> {
  try {
    const { requirePlan } = await import("@/lib/supabase/server");
    const planCheck = await requirePlan("studio");
    if (planCheck.error !== null) return { error: planCheck.error };
    const { supabase, user } = planCheck;

    const file = formData.get("file") as File | null;
    if (!file) return { error: "Geen bestand geselecteerd." };

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      return { error: "Alleen afbeeldingen en PDF-bestanden zijn toegestaan." };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { error: "Bestand is te groot (max 10MB)." };
    }

    // Server-side magic byte validation
    const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isJpeg = headerBytes[0] === 0xff && headerBytes[1] === 0xd8;
    const isPng =
      headerBytes[0] === 0x89 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x4e &&
      headerBytes[3] === 0x47;
    const isWebp = headerBytes[0] === 0x52 && headerBytes[1] === 0x49;
    const isPdfBytes =
      headerBytes[0] === 0x25 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x44 &&
      headerBytes[3] === 0x46;
    if (!isJpeg && !isPng && !isWebp && !isPdfBytes) {
      return {
        error:
          "Ongeldig bestandstype. Upload een JPEG, PNG, WebP afbeelding of PDF.",
      };
    }

    const ext = (file.name.split(".").pop() ?? "jpg").replace(
      /[^a-zA-Z0-9]/g,
      ""
    );
    const safeFilename = `${crypto.randomUUID()}.${ext}`;
    const sessionId = crypto.randomUUID();
    const storagePath = `${user.id}/${sessionId}/${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("invoice-uploads")
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      return {
        error: sanitizeSupabaseError(uploadError, {
          area: "uploadInvoiceFile.upload",
          userId: user.id,
        }),
      };
    }

    return { error: null, data: storagePath };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

// ─── Scan Invoice with AI ───

const INVOICE_OCR_SYSTEM_PROMPT = `Je bent een OCR-specialist voor Nederlandse uitgaande facturen.
Retourneer UITSLUITEND valide JSON — geen markdown, geen toelichting.

STAP 1 — AFLEZEN
Lees letterlijk van de factuur af:
- Klantgegevens: bedrijfsnaam/naam klant, adres, postcode, stad, KVK-nummer, BTW-nummer, e-mailadres
- Factuurnummer
- Factuurdatum (elk formaat: DD-MM-YYYY, DD/MM/YY, etc.)
- Vervaldatum (als vermeld)
- Factuurregels: omschrijving, aantal, eenheid (uren/dagen/stuks), tarief per eenheid
- Subtotaal exclusief BTW
- BTW-tarief en BTW-bedrag
- Totaalbedrag inclusief BTW
- BTW-regeling (standaard, intracommunautaire levering/verlegd, export buiten EU)

STAP 2 — BEREKENEN
- Als subtotaal ontbreekt maar totaal en BTW-tarief bekend zijn: subtotal_ex_vat = total_inc_vat / (1 + vat_rate/100)
- Als totaal ontbreekt: total_inc_vat = subtotal_ex_vat * (1 + vat_rate/100)
- Controleer: subtotal_ex_vat + vat_amount = total_inc_vat (max €0.05 afwijking)
- NL BTW-tarieven: 21% (standaard), 9% (laag tarief), 0% (vrijgesteld/verlegd/export)
- Let op: Nederlandse facturen gebruiken komma als decimaalteken (€ 1.250,00 = 1250.00)
- Bij "BTW verlegd" of intracommunautaire levering: vat_scheme = "eu_reverse_charge", vat_rate = 0
- Bij export buiten EU: vat_scheme = "export_outside_eu", vat_rate = 0
- Rond alle bedragen af op 2 decimalen

STAP 3 — REGELS EXTRAHEREN
- Elke factuurregel bevat: omschrijving, aantal, eenheid, tarief
- Eenheid classificeren als: "uren" (voor uren, hours, u), "dagen" (voor dagen, days, d), "stuks" (voor stuks, items, st, overig)
- Als geen afzonderlijke regels herkenbaar zijn, maak één regel met het totale bedrag als tarief en quantity 1

JSON-formaat:
{"client_name":"string|null","client_address":"string|null","client_city":"string|null","client_postal_code":"string|null","client_kvk_number":"string|null","client_btw_number":"string|null","client_email":"string|null","invoice_number":"string|null","issue_date":"YYYY-MM-DD|null","due_date":"YYYY-MM-DD|null","subtotal_ex_vat":number|null,"vat_rate":0|9|21,"vat_amount":number|null,"total_inc_vat":number|null,"vat_scheme":"standard"|"eu_reverse_charge"|"export_outside_eu","lines":[{"description":"string","quantity":number,"unit":"uren"|"dagen"|"stuks","rate":number}],"confidence":0.0-1.0}

confidence: hoe zeker je bent van de totale extractie. Gebruik null als een veld niet leesbaar is.`;

const aiInvoiceSchema = z.object({
  client_name: z.string().nullable().optional(),
  client_address: z.string().nullable().optional(),
  client_city: z.string().nullable().optional(),
  client_postal_code: z.string().nullable().optional(),
  client_kvk_number: z.string().nullable().optional(),
  client_btw_number: z.string().nullable().optional(),
  client_email: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  subtotal_ex_vat: z.number().nullable().optional(),
  vat_rate: z.number().nullable().optional(),
  vat_amount: z.number().nullable().optional(),
  total_inc_vat: z.number().nullable().optional(),
  vat_scheme: z
    .enum(["standard", "eu_reverse_charge", "export_outside_eu"])
    .optional(),
  lines: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unit: z.enum(["uren", "dagen", "stuks"]),
        rate: z.number(),
      })
    )
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export async function scanInvoiceWithAI(
  storagePath: string
): Promise<ActionResult<InvoiceOCRData>> {
  try {
    const { requirePlan } = await import("@/lib/supabase/server");
    const planCheck = await requirePlan("studio");
    if (planCheck.error !== null) return { error: planCheck.error };
    const { supabase } = planCheck;

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("invoice-uploads")
      .download(storagePath);

    if (downloadError || !fileData) {
      return { error: "Kon factuurbestand niet downloaden." };
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = fileData.type || "image/jpeg";
    const isPdfFile =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    // Call Anthropic API
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const documentContent = isPdfFile
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mimeType as
              | "image/jpeg"
              | "image/png"
              | "image/webp"
              | "image/gif",
            data: base64,
          },
        };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: INVOICE_OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            documentContent,
            {
              type: "text",
              text: "Analyseer deze factuur en extraheer de gevraagde velden in JSON.",
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        error: "Geen parsable tekst gevonden in de uitslag van Claude Vision.",
      };
    }

    // Strip markdown codeblock wrappers
    let cleanedText = textContent.text.trim();
    cleanedText = cleanedText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    const raw = JSON.parse(cleanedText);
    const validated = aiInvoiceSchema.safeParse(raw);
    if (!validated.success) {
      return { error: "AI-antwoord heeft een onverwacht formaat." };
    }

    const data = validated.data;

    // Fallback calculations
    if (data.subtotal_ex_vat == null && data.total_inc_vat != null) {
      const rate = data.vat_rate ?? 21;
      data.subtotal_ex_vat =
        Math.round((data.total_inc_vat / (1 + rate / 100)) * 100) / 100;
    }

    if (data.total_inc_vat == null && data.subtotal_ex_vat != null) {
      const rate = data.vat_rate ?? 21;
      data.total_inc_vat =
        Math.round(data.subtotal_ex_vat * (1 + rate / 100) * 100) / 100;
    }

    if (data.vat_amount == null && data.subtotal_ex_vat != null) {
      const rate = data.vat_rate ?? 21;
      data.vat_amount =
        Math.round(data.subtotal_ex_vat * (rate / 100) * 100) / 100;
    }

    // Cross-verify amounts
    if (
      data.subtotal_ex_vat != null &&
      data.total_inc_vat != null &&
      data.vat_rate != null
    ) {
      const expectedIncVat =
        Math.round(
          data.subtotal_ex_vat * (1 + data.vat_rate / 100) * 100
        ) / 100;
      const diff = Math.abs(expectedIncVat - data.total_inc_vat);
      if (diff > 0.05) {
        // total_inc_vat is more reliable (directly read from invoice)
        data.subtotal_ex_vat =
          Math.round(
            (data.total_inc_vat / (1 + data.vat_rate / 100)) * 100
          ) / 100;
        data.vat_amount =
          Math.round(
            data.subtotal_ex_vat * (data.vat_rate / 100) * 100
          ) / 100;
      }
    }

    const result: InvoiceOCRData = {
      client_name: data.client_name ?? null,
      client_address: data.client_address ?? null,
      client_city: data.client_city ?? null,
      client_postal_code: data.client_postal_code ?? null,
      client_kvk_number: data.client_kvk_number ?? null,
      client_btw_number: data.client_btw_number ?? null,
      client_email: data.client_email ?? null,
      invoice_number: data.invoice_number ?? null,
      issue_date: data.issue_date ?? null,
      due_date: data.due_date ?? null,
      subtotal_ex_vat: data.subtotal_ex_vat ?? null,
      vat_rate: (data.vat_rate ?? 21) as VatRate,
      vat_amount: data.vat_amount ?? null,
      total_inc_vat: data.total_inc_vat ?? null,
      vat_scheme: (data.vat_scheme ?? "standard") as VatScheme,
      lines: (data.lines ?? []).map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit as InvoiceUnit,
        rate: l.rate,
      })),
      confidence: data.confidence ?? 0.5,
    };

    return { error: null, data: result };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

// ─── Find or Create Client ───

export async function findOrCreateClient(
  clientData: ExtractedClientData
): Promise<ActionResult<{ id: string; name: string; isNew: boolean }>> {
  try {
    const { requireAuth } = await import("@/lib/supabase/server");
    const auth = await requireAuth();
    if (auth.error !== null) return { error: auth.error };
    const { supabase, user } = auth;

    const nameTerm = `%${clientData.name.trim().replace(/%/g, "")}%`;

    // Check for duplicates (same pattern as checkDuplicateClients)
    const orParts: string[] = [`name.ilike.${nameTerm}`];
    if (clientData.email?.trim())
      orParts.push(`email.eq.${clientData.email.trim()}`);
    if (clientData.kvk_number?.trim())
      orParts.push(`kvk_number.eq.${clientData.kvk_number.trim()}`);

    const { data: matches } = await supabase
      .from("clients")
      .select("id, name, email")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .or(orParts.join(","))
      .limit(5);

    if (matches && matches.length > 0) {
      // Use best match (first result)
      return {
        error: null,
        data: { id: matches[0].id, name: matches[0].name, isNew: false },
      };
    }

    // No match found — create new client
    const { createNewClient } = await import("@/features/clients/actions");
    const input: ClientInput = {
      name: clientData.name.trim(),
      contact_name: null,
      email: clientData.email?.trim() || null,
      address: clientData.address?.trim() || null,
      city: clientData.city?.trim() || null,
      postal_code: clientData.postal_code?.trim() || null,
      kvk_number: clientData.kvk_number?.trim() || null,
      btw_number: clientData.btw_number?.trim() || null,
    };

    const createResult = await createNewClient(input);
    if (createResult.error || !createResult.data) {
      return { error: createResult.error ?? "Kon klant niet aanmaken." };
    }

    return {
      error: null,
      data: {
        id: createResult.data.id,
        name: createResult.data.name,
        isNew: true,
      },
    };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}
