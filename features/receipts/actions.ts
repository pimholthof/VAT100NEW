"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult, Receipt, ReceiptInput } from "@/lib/types";
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

  if (error) return { error: error.message };

  return { error: null, data: (data ?? []) as Receipt[] };
}

export async function getReceipt(
  id: string
): Promise<ActionResult<Receipt>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Bon niet gevonden." };
  return { error: null, data };
}

export async function createReceipt(
  input: ReceiptInput
): Promise<ActionResult<Receipt>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(receiptSchema, input);
  if (v.error) return { error: v.error };

  const vat = calculateVat(input.amount_ex_vat ?? 0, input.vat_rate ?? 21);
  const amountExVat = vat.subtotalExVat;
  const vatRate = input.vat_rate ?? 21;
  const vatAmount = vat.vatAmount;
  const amountIncVat = vat.totalIncVat;

  const { data, error } = await supabase
    .from("receipts")
    .insert({
      user_id: user.id,
      vendor_name: input.vendor_name?.trim() || null,
      amount_ex_vat: amountExVat,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_inc_vat: amountIncVat,
      category: input.category || "Overig",
      cost_code: input.cost_code ?? null,
      receipt_date: input.receipt_date || null,
      ai_processed: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function updateReceipt(
  id: string,
  input: ReceiptInput
): Promise<ActionResult<Receipt>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(receiptSchema, input);
  if (v.error) return { error: v.error };

  const vat = calculateVat(input.amount_ex_vat ?? 0, input.vat_rate ?? 21);
  const amountExVat = vat.subtotalExVat;
  const vatRate = input.vat_rate ?? 21;
  const vatAmount = vat.vatAmount;
  const amountIncVat = vat.totalIncVat;

  const { data, error } = await supabase
    .from("receipts")
    .update({
      vendor_name: input.vendor_name?.trim() || null,
      amount_ex_vat: amountExVat,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_inc_vat: amountIncVat,
      category: input.category || "Overig",
      cost_code: input.cost_code ?? null,
      receipt_date: input.receipt_date || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function deleteReceipt(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function uploadReceiptImage(
  receiptId: string,
  formData: FormData
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Geen bestand geselecteerd." };

  if (!file.type.startsWith("image/")) {
    return { error: "Alleen afbeeldingen zijn toegestaan." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Bestand is te groot (max 10MB)." };
  }

  // Server-side magic byte validation (MIME type headers are spoofable)
  const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isJpeg = headerBytes[0] === 0xff && headerBytes[1] === 0xd8;
  const isPng = headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4e && headerBytes[3] === 0x47;
  const isWebp = headerBytes[0] === 0x52 && headerBytes[1] === 0x49; // RIFF
  if (!isJpeg && !isPng && !isWebp) {
    return { error: "Ongeldig bestandstype. Upload een JPEG, PNG of WebP afbeelding." };
  }

  // Sanitize filename: extract extension, use UUID to prevent path traversal
  const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-zA-Z0-9]/g, "");
  const safeFilename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${user.id}/${receiptId}/${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from("receipts")
    .update({ storage_path: storagePath })
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  return { error: null, data: storagePath };
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

  if (error) return { error: error.message };
  return { error: null, data: data.signedUrl };
}

export async function scanReceiptWithAI(
  receiptId: string
): Promise<ActionResult<Partial<ReceiptInput & { cost_code: number | null; confidence: number }>>> {
  const idCheck = uuidSchema.safeParse(receiptId);
  if (!idCheck.success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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

  // Call Anthropic API
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Je bent een OCR-specialist voor Nederlandse bonnen en facturen in het administratiesysteem VAT100. Analyseer de afbeelding en extraheer alle informatie. Retourneer UITSLUITEND valide JSON zonder expliciete markdown backticks rondom de JSON.
Velden in het JSON object:
- vendor_name (string): naam van de winkel/leverancier
- receipt_date (string): datum in YYYY-MM-DD format
- amount_ex_vat (number): bedrag exclusief BTW. Reken terug indien enkel het totaalbedrag en BTW-bedrag/percentage vermeld staan.
- vat_rate (number): BTW-tarief als integer (21, 9, of 0). Leid correct af uit de bon.
- cost_code (number): de meest passende kostensoort code uit deze lijst:
  4100=Huur, 4105=Energie, 4195=Overige huisvesting, 4230=Kleine investering, 4300=Kantoorkosten, 4330=Computer & software, 4340=Telefoon, 4341=Webhosting & internet, 4350=Porto, 4360=Vakliteratuur, 4400=Verzekeringen, 4500=Vervoer (OV/auto), 4510=Reiskosten, 4520=Parkeren, 4600=Reclame & marketing, 4610=Representatie, 4620=Website & SEO, 4700=Accountant & advies, 4710=Boekhouding, 4720=Juridisch, 4750=Bankkosten, 4800=Abonnementen & licenties, 4900=Eten & drinken zakelijk, 4910=Gereedschap & materiaal, 4999=Overig
- confidence (number 0-1): hoe zeker je bent van je extractie (bijv. 0.95)
Als een veld echt niet leesbaar is, gebruik dan expliciet null.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: base64,
              },
            },
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

    // Strip potential markdown JSON codeblocks returned by Claude
    const cleanedText = textContent.text.replace(/```json\n|\n```/g, '');
    const raw = JSON.parse(cleanedText);
    const aiReceiptSchema = z.object({
      vendor_name: z.string().nullable().optional(),
      receipt_date: z.string().nullable().optional(),
      amount_ex_vat: z.number().nullable().optional(),
      vat_rate: z.number().nullable().optional(),
      cost_code: z.number().nullable().optional(),
      confidence: z.number().min(0).max(1).optional(),
    });
    const validated = aiReceiptSchema.safeParse(raw);
    if (!validated.success) {
      return { error: "AI-antwoord heeft een onverwacht formaat." };
    }
    return { error: null, data: validated.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout bij AI-analyse.";
    return { error: message };
  }
}

export async function markReceiptAiProcessed(
  id: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("receipts")
    .update({ ai_processed: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
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

  if (receiptError) return { error: receiptError.message };

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
