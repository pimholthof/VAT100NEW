"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Receipt, ReceiptInput } from "@/lib/types";
import { receiptSchema, validate } from "@/lib/validation";
import { calculateVat } from "@/lib/format";

export async function getReceipts(): Promise<ActionResult<Receipt[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .order("receipt_date", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
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

  const systemPrompt = `Je bent een OCR-specialist voor Nederlandse bonnen en facturen. Analyseer de afbeelding en extraheer alle informatie. Retourneer UITSLUITEND valid JSON zonder markdown backticks.
Velden:
- vendor_name (string): naam van de winkel/leverancier
- receipt_date (string): datum in YYYY-MM-DD format
- amount_ex_vat (number): bedrag exclusief BTW. Als alleen incl BTW zichtbaar is, reken terug.
- vat_rate (number): BTW-tarief — 21, 9, of 0. Leid af uit de bon.
- cost_code (number): de meest passende kostensoort uit deze lijst:
  4100=Huur, 4105=Energie, 4195=Overige huisvesting, 4230=Kleine investering, 4300=Kantoorkosten, 4330=Computer & software, 4340=Telefoon, 4341=Webhosting & internet, 4350=Porto, 4360=Vakliteratuur, 4400=Verzekeringen, 4500=Vervoer (OV/auto), 4510=Reiskosten, 4520=Parkeren, 4600=Reclame & marketing, 4610=Representatie, 4620=Website & SEO, 4700=Accountant & advies, 4710=Boekhouding, 4720=Juridisch, 4750=Bankkosten, 4800=Abonnementen & licenties, 4900=Eten & drinken zakelijk, 4910=Gereedschap & materiaal, 4999=Overig
- confidence (number 0-1): hoe zeker je bent van de extractie
Als een veld niet leesbaar is, gebruik null.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
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
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Analyseer deze bon en extraheer de gevraagde velden als JSON.",
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return { error: "Geen tekst in AI-antwoord." };
    }

    const raw = JSON.parse(textContent.text);
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
