/**
 * Automatische Bonnetjes-matching (Transactie → Bon)
 *
 * Koppelt banktransacties aan bonnetjes op basis van:
 * 1. Bedrag match (±€0.05 tolerantie)
 * 2. Datum match (±3 dagen)
 * 3. Leverancier/tegenpartij fuzzy match
 *
 * Resultaat gaat naar action_feed voor gebruikersbevestiging.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const AMOUNT_TOLERANCE = 0.05; // €0.05
const DATE_TOLERANCE_DAYS = 3;
const MIN_NAME_LENGTH = 3;

interface ReceiptMatchResult {
  matched: number;
  suggestions: Array<{
    transactionId: string;
    receiptId: string;
    confidence: number;
    matchReasons: string[];
  }>;
}

/**
 * Zoek matches tussen ongematchte uitgaven en bonnetjes.
 */
export async function autoMatchReceipts(
  userId: string,
  supabase: SupabaseClient
): Promise<ReceiptMatchResult> {
  const result: ReceiptMatchResult = { matched: 0, suggestions: [] };

  // 1. Haal ongematchte uitgaven op (negatieve transacties)
  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("id, amount, description, counterpart_name, booking_date")
    .eq("user_id", userId)
    .lt("amount", 0)
    .is("linked_receipt_id", null)
    .order("booking_date", { ascending: false })
    .limit(50);

  if (!transactions || transactions.length === 0) return result;

  // 2. Haal ongematchte bonnetjes op
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, vendor_name, amount_ex_vat, vat_amount, receipt_date")
    .eq("user_id", userId)
    .order("receipt_date", { ascending: false })
    .limit(200);

  if (!receipts || receipts.length === 0) return result;

  // Track welke bonnetjes al gebruikt zijn
  const usedReceiptIds = new Set<string>();

  for (const tx of transactions) {
    const txAmount = Math.abs(Number(tx.amount));
    const txDate = new Date(tx.booking_date);
    const txCounterpart = normalize(tx.counterpart_name ?? "");
    const txDesc = normalize(tx.description ?? "");

    let bestMatch: {
      receiptId: string;
      confidence: number;
      reasons: string[];
    } | null = null;

    for (const receipt of receipts) {
      if (usedReceiptIds.has(receipt.id)) continue;

      const receiptTotal =
        (Number(receipt.amount_ex_vat) || 0) +
        (Number(receipt.vat_amount) || 0);
      const receiptDate = new Date(receipt.receipt_date);
      const receiptVendor = normalize(receipt.vendor_name ?? "");

      const reasons: string[] = [];
      let confidence = 0;

      // Bedrag match
      const amountDiff = Math.abs(txAmount - receiptTotal);
      if (amountDiff <= AMOUNT_TOLERANCE) {
        confidence += 0.4;
        reasons.push("bedrag");
      } else {
        continue; // Bedrag is vereist
      }

      // Datum match
      const daysDiff = Math.abs(
        (txDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= DATE_TOLERANCE_DAYS) {
        confidence += 0.3;
        reasons.push("datum");
      } else if (daysDiff <= 7) {
        confidence += 0.15;
        reasons.push("datum (±7d)");
      } else {
        continue; // Datum te ver uiteen
      }

      // Leverancier match
      if (
        receiptVendor.length >= MIN_NAME_LENGTH &&
        (txCounterpart.includes(receiptVendor) ||
          receiptVendor.includes(txCounterpart) ||
          txDesc.includes(receiptVendor))
      ) {
        confidence += 0.3;
        reasons.push("leverancier");
      }

      if (confidence > (bestMatch?.confidence ?? 0)) {
        bestMatch = { receiptId: receipt.id, confidence, reasons };
      }
    }

    if (bestMatch && bestMatch.confidence >= 0.6) {
      usedReceiptIds.add(bestMatch.receiptId);

      if (bestMatch.confidence >= 0.9) {
        // Auto-link bij hoge confidence
        await supabase
          .from("bank_transactions")
          .update({ linked_receipt_id: bestMatch.receiptId })
          .eq("id", tx.id)
          .eq("user_id", userId);

        result.matched++;
      } else {
        // Suggestie in action feed bij lagere confidence
        await supabase.from("action_feed").insert({
          user_id: userId,
          type: "match_suggestion",
          title: "Bon-match gevonden",
          description: `Transactie "${tx.counterpart_name || tx.description}" (${formatAmount(tx.amount)}) lijkt overeen te komen met een bon. Match: ${bestMatch.reasons.join(", ")}.`,
          amount: Math.abs(Number(tx.amount)),
          ai_confidence: bestMatch.confidence,
        });
      }

      result.suggestions.push({
        transactionId: tx.id,
        receiptId: bestMatch.receiptId,
        confidence: bestMatch.confidence,
        matchReasons: bestMatch.reasons,
      });
    }
  }

  return result;
}

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(Math.abs(amount));
}
