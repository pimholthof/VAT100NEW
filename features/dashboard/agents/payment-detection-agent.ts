import type { ActionResult, ActionFeedItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { CONFIDENCE_THRESHOLDS, toHumanReviewTitle, toHumanReviewDescription } from "@/lib/tax/fiscal-claim-validator";
import { getErrorMessage } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Agent 5: Payment Detection Engine.
 * Matches incoming bank transactions to outstanding invoices and auto-marks as paid.
 */
export async function runPaymentDetectionAgent(userId: string, externalSupabase?: Awaited<ReturnType<typeof createClient>>): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();

    // 1. Find incoming transactions not yet linked to an invoice
    const { data: incomingTx, error: txError } = await supabase
      .from("bank_transactions")
      .select("id, description, counterpart_name, amount, booking_date")
      .eq("user_id", userId)
      .eq("is_income", true)
      .is("linked_invoice_id", null)
      .order("booking_date", { ascending: false })
      .limit(50);

    if (txError) return { error: txError.message };
    if (!incomingTx || incomingTx.length === 0) return { error: null, data: { created: 0 } };

    // 2. Get outstanding invoices
    const { data: openInvoices, error: invError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_inc_vat, client_id")
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"]);

    if (invError) return { error: invError.message };
    if (!openInvoices || openInvoices.length === 0) return { error: null, data: { created: 0 } };

    // 3. Check which transactions already have pending payment actions
    const txIds = incomingTx.map((tx: { id: string }) => tx.id);
    const { data: existingActions } = await supabase
      .from("action_feed")
      .select("related_transaction_id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .in("type", ["match_suggestion", "autonomous_match"])
      .in("related_transaction_id", txIds);

    const existingTxIds = new Set(
      (existingActions ?? []).map((a: { related_transaction_id: string | null }) => a.related_transaction_id)
    );

    const newActions: Partial<ActionFeedItem>[] = [];

    for (const tx of incomingTx) {
      if (existingTxIds.has(tx.id)) continue;

      const txAmount = Math.abs(Number(tx.amount));
      const txDesc = (tx.description ?? "").toLowerCase();
      const txCounterpart = (tx.counterpart_name ?? "").toLowerCase();

      // Try to find a matching invoice
      let bestMatch: { invoice: typeof openInvoices[0]; confidence: number } | null = null;

      for (const inv of openInvoices) {
        let confidence = 0;
        const invTotal = Number(inv.total_inc_vat);
        const invNumber = inv.invoice_number.toLowerCase();

        // Amount match (±€0.05 tolerance)
        if (Math.abs(txAmount - invTotal) <= 0.05) {
          confidence += 0.70;
        } else {
          continue; // No amount match = skip
        }

        // Invoice number in description
        if (txDesc.includes(invNumber) || txCounterpart.includes(invNumber)) {
          confidence += 0.25;
        }

        // Amount is exact match (no rounding difference)
        if (Math.abs(txAmount - invTotal) < 0.01) {
          confidence += 0.05;
        }

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { invoice: inv, confidence };
        }
      }

      if (!bestMatch) continue;

      if (bestMatch.confidence >= CONFIDENCE_THRESHOLDS.AUTO_EXECUTE) {
        // High confidence: auto-mark as paid
        await supabase
          .from("invoices")
          .update({ status: "paid" })
          .eq("id", bestMatch.invoice.id)
          .eq("user_id", userId);

        await supabase
          .from("bank_transactions")
          .update({ linked_invoice_id: bestMatch.invoice.id })
          .eq("id", tx.id)
          .eq("user_id", userId);

        newActions.push({
          user_id: userId,
          type: "autonomous_match",
          title: `Betaling ontvangen: ${bestMatch.invoice.invoice_number}`,
          description: `Factuur ${bestMatch.invoice.invoice_number} is automatisch als betaald gemarkeerd (${Math.round(bestMatch.confidence * 100)}% zekerheid).`,
          amount: txAmount,
          related_transaction_id: tx.id,
          related_invoice_id: bestMatch.invoice.id,
          ai_confidence: bestMatch.confidence,
          status: "resolved",
        });

        // Remove from openInvoices to prevent double-matching
        const idx = openInvoices.indexOf(bestMatch.invoice);
        if (idx > -1) openInvoices.splice(idx, 1);
      } else if (bestMatch.confidence >= 0.70) {
        // Medium confidence: suggest to user
        const payTitle = `Mogelijke betaling: ${bestMatch.invoice.invoice_number}`;
        const payDesc = `Inkomende transactie van ${new Date(tx.booking_date).toLocaleDateString("nl-NL")} (${formatCurrency(txAmount)}) lijkt een betaling voor factuur ${bestMatch.invoice.invoice_number}.`;
        newActions.push({
          user_id: userId,
          type: "match_suggestion",
          title: toHumanReviewTitle(payTitle, bestMatch.confidence),
          description: toHumanReviewDescription(payDesc, bestMatch.confidence),
          amount: txAmount,
          related_transaction_id: tx.id,
          related_invoice_id: bestMatch.invoice.id,
          ai_confidence: bestMatch.confidence,
          status: "pending",
        });
      }
    }

    if (newActions.length > 0) {
      const { error: insertError } = await supabase.from("action_feed").insert(newActions);
      if (insertError) return { error: insertError.message };

      // Audit trail
      for (const action of newActions) {
        const isAuto = action.status === "resolved";
        import("@/lib/audit/agent-audit").then((m) =>
          m.logAgentDecision({
            agentName: "PaymentDetectionAgent",
            actionType: isAuto ? "autonomous_action" : "match_suggestion",
            userId,
            confidence: action.ai_confidence ?? 0,
            inputSummary: { transactionId: action.related_transaction_id, invoiceId: action.related_invoice_id, amount: action.amount },
            outputSummary: { type: action.type },
            wasAutoExecuted: isAuto,
          }).catch(() => {})
        );
      }
    }

    return { error: null, data: { created: newActions.length } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "payment_detection", userId } });
    return { error: getErrorMessage(err) };
  }
}
