import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Agent 1: Receipt Catcher (Webhook Endpoint)
 * 
 * This endpoint receives uploaded receipt documents (PDF/image)
 * and uses an LLM Vision API to extract structured data.
 * 
 * In production, this would be triggered by:
 * - SendGrid/Resend Inbound Parse (email forwarding)
 * - Direct file upload from the app
 * 
 * For now, this accepts a JSON payload with extracted data
 * and creates action items for matching.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, vendorName, amount, vatAmount, receiptDate, storagePath } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { error: "userId and amount are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. Store the receipt in the database
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
      return NextResponse.json({ error: receiptError.message }, { status: 500 });
    }

    // 2. Try to find a matching bank transaction (amount + date range ±3 days)
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
      (tx) => Math.abs(Math.abs(Number(tx.amount)) - amount) < 0.02
    );

    if (match) {
      // High-confidence match: auto-link and create a confirmation action
      await supabase
        .from("bank_transactions")
        .update({ linked_receipt_id: receipt.id })
        .eq("id", match.id);

      await supabase.from("action_feed").insert({
        user_id: userId,
        type: "match_suggestion",
        title: `Bon automatisch gekoppeld: ${vendorName ?? "Onbekend"}`,
        description: `Bon van ${vendorName ?? "onbekend"} (${new Date(receiptDate).toLocaleDateString("nl-NL")}) is gekoppeld aan afschrijving "${match.counterpart_name ?? match.description}". Bevestig of corrigeer.`,
        amount,
        related_transaction_id: match.id,
        related_receipt_id: receipt.id,
        ai_confidence: 0.92,
      });

      return NextResponse.json({
        status: "matched",
        receiptId: receipt.id,
        matchedTransactionId: match.id,
      });
    }

    // No match found - just store the receipt, it will be matched later
    return NextResponse.json({
      status: "stored",
      receiptId: receipt.id,
      message: "Receipt opgeslagen. Nog geen bijpassende transactie gevonden.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
