import type { ActionResult, ActionFeedItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getMissingReceiptConfidence, toHumanReviewTitle, toHumanReviewDescription } from "@/lib/tax/fiscal-claim-validator";
import { getErrorMessage } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Agent 6: Missing Receipt Detection.
 * Detecteert uitgaande banktransacties (>€20) zonder gekoppelde bon.
 * Maakt "missing_receipt" actie-items zodat de gebruiker een bon kan toevoegen.
 */
export async function runMissingReceiptDetection(
  userId: string,
  externalSupabase?: Awaited<ReturnType<typeof createClient>>
): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();

    // Vind uitgaande transacties >€20 zonder gekoppelde bon (laatste 90 dagen)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: expenses, error: txError } = await supabase
      .from("bank_transactions")
      .select("id, description, counterpart_name, amount, booking_date")
      .eq("user_id", userId)
      .eq("is_income", false)
      .is("linked_receipt_id", null)
      .gte("booking_date", ninetyDaysAgo.toISOString().split("T")[0])
      .lt("amount", -20) // Negative amounts = expenses
      .order("booking_date", { ascending: false })
      .limit(20);

    if (txError) return { error: txError.message };
    if (!expenses || expenses.length === 0) return { error: null, data: { created: 0 } };

    // Check welke transacties al een actie-item hebben
    const txIds = expenses.map((tx: { id: string }) => tx.id);
    const { data: existingActions } = await supabase
      .from("action_feed")
      .select("related_transaction_id")
      .eq("user_id", userId)
      .in("type", ["missing_receipt", "match_suggestion", "autonomous_match"])
      .in("related_transaction_id", txIds);

    const existingTxIds = new Set(
      (existingActions ?? []).map((a: { related_transaction_id: string | null }) => a.related_transaction_id)
    );

    const newActions: Partial<ActionFeedItem>[] = [];

    for (const tx of expenses) {
      if (existingTxIds.has(tx.id)) continue;

      const amount = Math.abs(Number(tx.amount));
      const vendor = tx.counterpart_name || tx.description || "Onbekend";
      const date = new Date(tx.booking_date).toLocaleDateString("nl-NL");
      const confidence = getMissingReceiptConfidence(amount);
      const mrTitle = `Bon ontbreekt: ${vendor}`;
      const mrDesc = `Uitgave van ${formatCurrency(amount)} op ${date}. Voeg een bon toe voor je administratie.`;

      newActions.push({
        user_id: userId,
        type: "missing_receipt",
        title: toHumanReviewTitle(mrTitle, confidence),
        description: toHumanReviewDescription(mrDesc, confidence),
        amount,
        related_transaction_id: tx.id,
        ai_confidence: confidence,
        status: "pending",
      });
    }

    if (newActions.length > 0) {
      await supabase.from("action_feed").insert(newActions);

      // Audit trail
      for (const action of newActions) {
        import("@/lib/audit/agent-audit").then((m) =>
          m.logAgentDecision({
            agentName: "MissingReceiptDetection",
            actionType: "classification",
            userId,
            confidence: action.ai_confidence ?? 0,
            inputSummary: { transactionId: action.related_transaction_id, amount: action.amount },
            outputSummary: { type: "missing_receipt" },
            wasAutoExecuted: false,
          }).catch(() => {})
        );
      }
    }

    return { error: null, data: { created: newActions.length } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "missing_receipt_detection", userId } });
    return { error: getErrorMessage(err) };
  }
}
