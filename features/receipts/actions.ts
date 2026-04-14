"use server";

import { z } from "zod";
import { sanitizeSupabaseError } from "@/lib/errors";
import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ActionResult, Receipt, ReceiptInput, VatRate } from "@/lib/types";
import { receiptSchema, uuidSchema, validate } from "@/lib/validation";
import { calculateVat } from "@/lib/format";

export async function getReceipts(filters?: {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<Receipt[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("receipt_date", { ascending: false });

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.dateFrom) {
    query = query.gte("receipt_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("receipt_date", filters.dateTo);
  }

  if (filters?.search) {
    const q = `%${filters.search}%`;
    query = query.or(`vendor_name.ilike.${q},amount_inc_vat::text.ilike.${q},amount_ex_vat::text.ilike.${q}`);
  }

  query = query.limit(200);

  const { data, error } = await query;

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "getReceipts",
        userId: user.id,
        filters,
      }),
    };
  }

  return { error: null, data: (data ?? []) as Receipt[] };
}

export async function getReceipt(
  id: string
): Promise<ActionResult<Receipt>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { error: "Bon niet gevonden." };

    return {
      error: sanitizeSupabaseError(error, {
        area: "getReceipt",
        receiptId: id,
        userId: user.id,
      }),
    };
  }
  if (!data) return { error: "Bon niet gevonden." };
  return { error: null, data };
}

export async function createReceipt(
  input: ReceiptInput
): Promise<ActionResult<Receipt>> {
  try {
    const auth = await requireAuth();
    if (auth.error !== null) return { error: auth.error };
    const { supabase, user } = auth;

    const v = validate(receiptSchema, input);
    if (v.error) return { error: v.error };

    const vat = calculateVat(input.amount_ex_vat ?? 0, (input.vat_rate ?? 21) as VatRate);
    const amountExVat = vat.subtotalExVat;
    const vatRate = input.vat_rate ?? 21;
    let vatAmount = vat.vatAmount;
    const category = input.category || "Overig";
    const costCode = input.cost_code ?? null;

    // Horeca: force deductible VAT to 0 (conform wetgeving)
    const isHoreca = category === "Eten & drinken horeca" || category === "Eten & drinken zakelijk";
    if (isHoreca) vatAmount = 0;

    const amountIncVat = amountExVat + vatAmount;

    // Representatie 80/20 split: set business_percentage to 80
    const isRepresentatie = costCode === 4500 || category === "Representatie";
    const businessPercentage = isRepresentatie ? 80 : (input.business_percentage ?? 100);

    const { data, error } = await supabase
      .from("receipts")
      .insert({
        user_id: user.id,
        vendor_name: input.vendor_name?.trim() || null,
        amount_ex_vat: amountExVat,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        amount_inc_vat: amountIncVat,
        category,
        cost_code: costCode,
        receipt_date: input.receipt_date || null,
        ai_processed: false,
        business_percentage: businessPercentage,
      })
      .select()
      .single();

    if (error) {
      return {
        error: sanitizeSupabaseError(error, {
          area: "createReceipt",
          userId: user.id,
        }),
      };
    }

    // Auto-book to ledger
    const { autoBookReceipt } = await import("@/features/ledger/actions");
    await autoBookReceipt({
      receiptId: data.id,
      userId: user.id,
      entryDate: input.receipt_date || new Date().toISOString().split("T")[0],
      description: input.vendor_name?.trim() || "Onbekende leverancier",
      costCode: costCode || 4999,
      amountExVat,
      vatAmount,
      businessPercentage,
      category,
      supabase,
    }).catch(() => {}); // Non-fatal: ledger is best-effort

    return { error: null, data };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

export async function updateReceipt(
  id: string,
  input: ReceiptInput
): Promise<ActionResult<Receipt>> {
  try {
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) return { error: "Ongeldig bon-ID." };

    const auth = await requireAuth();
    if (auth.error !== null) return { error: auth.error };
    const { supabase, user } = auth;

    const v = validate(receiptSchema, input);
    if (v.error) return { error: v.error };

    const vat = calculateVat(input.amount_ex_vat ?? 0, (input.vat_rate ?? 21) as VatRate);
    const amountExVat = vat.subtotalExVat;
    const vatRate = input.vat_rate ?? 21;
    const category = input.category || "Overig";
    const costCode = input.cost_code ?? null;

    // Horeca: force deductible VAT to 0 (conform wetgeving)
    const isHoreca = category === "Eten & drinken horeca" || category === "Eten & drinken zakelijk";
    const vatAmount = isHoreca ? 0 : vat.vatAmount;

    const amountIncVat = amountExVat + vatAmount;

    // Representatie 80/20 split
    const isRepresentatie = costCode === 4500 || category === "Representatie";
    const businessPercentage = isRepresentatie ? 80 : (input.business_percentage ?? 100);

    const { data, error } = await supabase
      .from("receipts")
      .update({
        vendor_name: input.vendor_name?.trim() || null,
        amount_ex_vat: amountExVat,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        amount_inc_vat: amountIncVat,
        category,
        cost_code: costCode,
        receipt_date: input.receipt_date || null,
        business_percentage: businessPercentage,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return {
        error: sanitizeSupabaseError(error, {
          area: "updateReceipt",
          receiptId: id,
          userId: user.id,
        }),
      };
    }

    // Remove old ledger entries for this receipt and re-book
    await supabase
      .from("ledger_entries")
      .delete()
      .eq("source_receipt_id", id)
      .eq("user_id", user.id);

    const { autoBookReceipt } = await import("@/features/ledger/actions");
    await autoBookReceipt({
      receiptId: id,
      userId: user.id,
      entryDate: input.receipt_date || new Date().toISOString().split("T")[0],
      description: input.vendor_name?.trim() || "Onbekende leverancier",
      costCode: costCode || 4999,
      amountExVat,
      vatAmount,
      businessPercentage,
      category,
      supabase,
    }).catch(() => {});

    return { error: null, data };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

export async function deleteReceipt(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Soft-delete: archiveer in plaats van verwijderen
  const { error } = await supabase
    .from("receipts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "deleteReceipt",
        receiptId: id,
        userId: user.id,
      }),
    };
  }
  return { error: null };
}

export async function deleteReceipts(ids: string[]): Promise<ActionResult> {
  if (ids.length === 0) return { error: "Geen bonnen geselecteerd." };
  if (ids.length > 100) return { error: "Maximaal 100 bonnen tegelijk archiveren." };

  for (const id of ids) {
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) return { error: "Ongeldig bon-ID." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Soft-delete: archiveer in plaats van verwijderen
  const { error } = await supabase
    .from("receipts")
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "deleteReceipts",
        receiptIds: ids,
        userId: user.id,
      }),
    };
  }
  return { error: null };
}

export async function restoreReceipt(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("receipts")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function uploadReceiptImage(
  receiptId: string,
  formData: FormData
): Promise<ActionResult<string>> {
  try {
    const idCheck = uuidSchema.safeParse(receiptId);
    if (!idCheck.success) return { error: "Ongeldig bon-ID." };

    const auth = await requireAuth();
    if (auth.error !== null) return { error: auth.error };
    const { supabase, user } = auth;

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

    // Server-side magic byte validation (MIME type headers are spoofable)
    const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isJpeg = headerBytes[0] === 0xff && headerBytes[1] === 0xd8;
    const isPng = headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4e && headerBytes[3] === 0x47;
    const isWebp = headerBytes[0] === 0x52 && headerBytes[1] === 0x49; // RIFF
    const isPdfBytes = headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46; // %PDF
    if (!isJpeg && !isPng && !isWebp && !isPdfBytes) {
      return { error: "Ongeldig bestandstype. Upload een JPEG, PNG, WebP afbeelding of PDF." };
    }

    // Sanitize filename: extract extension, use UUID to prevent path traversal
    const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-zA-Z0-9]/g, "");
    const safeFilename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${user.id}/${receiptId}/${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      return {
        error: sanitizeSupabaseError(uploadError, {
          area: "uploadReceiptImage.upload",
          receiptId,
          userId: user.id,
        }),
      };
    }

    const { error: updateError } = await supabase
      .from("receipts")
      .update({ storage_path: storagePath })
      .eq("id", receiptId)
      .eq("user_id", user.id);

    if (updateError) {
      return {
        error: sanitizeSupabaseError(updateError, {
          area: "uploadReceiptImage.updateReceipt",
          receiptId,
          userId: user.id,
        }),
      };
    }

    return { error: null, data: storagePath };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

export async function getReceiptImageUrl(
  storagePath: string
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase } = auth;

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, 3600);

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "getReceiptImageUrl",
        storagePath,
      }),
    };
  }
  return { error: null, data: data.signedUrl };
}

export async function scanReceiptWithAI(
  receiptId: string
): Promise<ActionResult<Partial<ReceiptInput & { cost_code: number | null; confidence: number; amount_inc_vat: number | null }>>> {
  try {
    const idCheck = uuidSchema.safeParse(receiptId);
    if (!idCheck.success) return { error: "Ongeldig bon-ID." };

    // Feature-gate: AI scan beschikbaar vanaf Studio (net als bankkoppeling)
    const { requirePlan } = await import("@/lib/supabase/server");
    const planCheck = await requirePlan("studio");
    if (planCheck.error !== null) return { error: planCheck.error };
    const { supabase, user } = planCheck;

    // Get receipt to find storage_path
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("storage_path")
      .eq("id", receiptId)
      .eq("user_id", user.id)
      .single();

    if (receiptError || !receipt?.storage_path) {
      return { error: "Bon-afbeelding niet gevonden." };
    }

    // Download image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(receipt.storage_path);

    if (downloadError || !fileData) {
      return { error: "Kon afbeelding niet downloaden." };
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = fileData.type || "image/jpeg";
    const isPdfFile = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

    // Call Anthropic API
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `Je bent een OCR-specialist voor Nederlandse bonnen en facturen.
Retourneer UITSLUITEND valide JSON — geen markdown, geen toelichting.

STAP 1 — AFLEZEN
Lees letterlijk van de bon af:
- Winkelnaam/leverancier (bovenaan of onderaan, vaak vetgedrukt)
- Datum (elk formaat: DD-MM-YYYY, DD/MM/YY, etc.)
- Totaalbedrag inclusief BTW ("Totaal", "Te betalen", "Total", het laatste/grootste bedrag)
- BTW-bedrag en/of BTW-percentage (als vermeld)
- Bedrag exclusief BTW (als apart vermeld)

STAP 2 — BEREKENEN
- Als alleen totaal (inc BTW) zichtbaar: amount_ex_vat = amount_inc_vat / (1 + vat_rate/100)
- Als alleen ex BTW zichtbaar: amount_inc_vat = amount_ex_vat * (1 + vat_rate/100)
- Bij meerdere BTW-tarieven op één bon: gebruik het tarief van de grootste post
- NL BTW-tarieven: 21% (standaard), 9% (voedsel, boeken, medicijnen, horeca), 0% (vrijgesteld)
- Let op: Nederlandse bonnen gebruiken komma als decimaalteken (€ 12,50 = 12.50)
- Rond af op 2 decimalen. Controleer: amount_ex_vat + BTW = amount_inc_vat

STAP 3 — CLASSIFICEREN
Kies de best passende kostensoort:
4100=Huur, 4105=Energie, 4195=Overige huisvesting, 4230=Kleine investering (<€450), 4300=Kantoorkosten, 4330=Computer & software, 4340=Telefoon, 4341=Webhosting & internet, 4350=Porto, 4360=Vakliteratuur, 4400=Verzekeringen, 4500=Vervoer (OV/auto), 4510=Reiskosten, 4520=Parkeren, 4600=Reclame & marketing, 4610=Representatie (zakelijk dineren met klant), 4620=Website & SEO, 4700=Accountant & advies, 4710=Boekhouding, 4720=Juridisch, 4750=Bankkosten, 4800=Abonnementen & licenties, 4900=Eten & drinken zakelijk, 4910=Gereedschap & materiaal, 4999=Overig

JSON-formaat:
{"vendor_name":"string|null","receipt_date":"YYYY-MM-DD|null","amount_inc_vat":number|null,"amount_ex_vat":number|null,"vat_rate":21|9|0,"cost_code":number,"confidence":0.0-1.0}

confidence: hoe zeker je bent van de totale extractie. Gebruik null als een veld echt niet leesbaar is.`;

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
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: base64,
          },
        };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            documentContent,
            {
              type: "text",
              text: "Analyseer deze bon en extraheer de gevraagde velden in JSON.",
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return { error: "Geen parsable tekst gevonden in de uitslag van Claude Vision." };
    }

    // Strip markdown codeblock wrappers (handles ```json, ```, with/without newlines)
    let cleanedText = textContent.text.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const raw = JSON.parse(cleanedText);
    const aiReceiptSchema = z.object({
      vendor_name: z.string().nullable().optional(),
      receipt_date: z.string().nullable().optional(),
      amount_inc_vat: z.number().nullable().optional(),
      amount_ex_vat: z.number().nullable().optional(),
      vat_rate: z.number().nullable().optional(),
      cost_code: z.number().nullable().optional(),
      confidence: z.number().min(0).max(1).optional(),
    });
    const validated = aiReceiptSchema.safeParse(raw);
    if (!validated.success) {
      return { error: "AI-antwoord heeft een onverwacht formaat." };
    }

    const data = validated.data;

    // Fallback: als amount_ex_vat ontbreekt maar amount_inc_vat wel bekend is, bereken terug
    if (data.amount_ex_vat == null && data.amount_inc_vat != null) {
      const rate = data.vat_rate ?? 21;
      data.amount_ex_vat = Math.round((data.amount_inc_vat / (1 + rate / 100)) * 100) / 100;
    }

    // Cross-verificatie: als beide bedragen aanwezig zijn, controleer consistentie
    if (data.amount_ex_vat != null && data.amount_inc_vat != null && data.vat_rate != null) {
      const expectedIncVat = Math.round(data.amount_ex_vat * (1 + data.vat_rate / 100) * 100) / 100;
      const diff = Math.abs(expectedIncVat - data.amount_inc_vat);
      // Als verschil > €0.05 dan is amount_inc_vat betrouwbaarder (direct van bon gelezen)
      if (diff > 0.05) {
        data.amount_ex_vat = Math.round((data.amount_inc_vat / (1 + data.vat_rate / 100)) * 100) / 100;
      }
    }

    return { error: null, data };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

export async function markReceiptAiProcessed(
  id: string
): Promise<ActionResult> {
  try {
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) return { error: "Ongeldig bon-ID." };

    const auth = await requireAuth();
    if (auth.error !== null) return { error: auth.error };
    const { supabase, user } = auth;

    const { error } = await supabase
      .from("receipts")
      .update({ ai_processed: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return {
        error: sanitizeSupabaseError(error, {
          area: "markReceiptAiProcessed",
          receiptId: id,
          userId: user.id,
        }),
      };
    }
    return { error: null };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

/**
 * Common logic for processing a receipt (e.g. from an inbound email or direct webhook).
 * Handles storage, matching, and action creation.
 */
export async function processReceiptWebhook(payload: {
  userId: string;
  vendorName?: string;
  amount: number;
  vatAmount?: number;
  receiptDate?: string;
  storagePath?: string;
}, externalSupabase?: ReturnType<typeof createServiceClient>): Promise<ActionResult<{ status: string; receiptId: string; matchedTransactionId?: string }>> {
  const supabase = externalSupabase || createServiceClient();
  const { userId, vendorName, amount, vatAmount, receiptDate, storagePath } = payload;

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      user_id: userId,
      vendor_name: vendorName ?? null,
      amount_inc_vat: amount,
      vat_amount: vatAmount ?? null,
      amount_ex_vat: amount - (vatAmount ?? 0),
      receipt_date: receiptDate ?? new Date().toISOString().split("T")[0],
      storage_path: storagePath ?? null,
      ai_processed: true,
    })
    .select()
    .single();

  if (receiptError) {
    return {
      error: sanitizeSupabaseError(receiptError, {
        area: "processReceiptWebhook.createReceipt",
        userId,
      }),
    };
  }

  // 2. Try to find a matching bank transaction
  const txDate = new Date(receiptDate ?? new Date());
  const dateFrom = new Date(txDate);
  dateFrom.setDate(dateFrom.getDate() - 3);
  const dateTo = new Date(txDate);
  dateTo.setDate(dateTo.getDate() + 3);

  const { data: matchingTx } = await supabase
    .from("bank_transactions")
    .select("id, description, counterpart_name, amount")
    .eq("user_id", userId)
    .is("linked_receipt_id", null)
    .gte("booking_date", dateFrom.toISOString().split("T")[0])
    .lte("booking_date", dateTo.toISOString().split("T")[0]);

  const match = (matchingTx ?? []).find(
    (tx: { amount: number }) => Math.abs(Math.abs(Number(tx.amount)) - amount) < 0.02
  );

  if (match) {
    await supabase
      .from("bank_transactions")
      .update({ linked_receipt_id: receipt.id })
      .eq("id", match.id);

    await supabase.from("action_feed").insert({
      user_id: userId,
      type: "match_suggestion",
      title: `Bon automatisch gekoppeld: ${vendorName ?? "Onbekend"}`,
      description: `Bon van ${vendorName ?? "onbekend"} (${new Date(receiptDate || "").toLocaleDateString("nl-NL")}) is gekoppeld aan afschrijving "${match.counterpart_name ?? match.description}". Bevestig of corrigeer.`,
      amount,
      related_transaction_id: match.id,
      related_receipt_id: receipt.id,
      ai_confidence: 0.92,
    });

    return { 
      error: null, 
      data: { status: "matched", receiptId: receipt.id, matchedTransactionId: match.id } 
    };
  }

  return { 
    error: null, 
    data: { status: "stored", receiptId: receipt.id } 
  };
}
