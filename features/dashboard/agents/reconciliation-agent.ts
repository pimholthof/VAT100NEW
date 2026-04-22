import type { ActionResult, ActionFeedItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { CONFIDENCE_THRESHOLDS, toHumanReviewTitle, toHumanReviewDescription } from "@/lib/tax/fiscal-claim-validator";
import { getErrorMessage } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Agent 2: The Reconciliation Engine.
 * Scans for uncategorized transactions and generates action items.
 */
export async function runReconciliationAgent(userId: string, externalSupabase?: Awaited<ReturnType<typeof createClient>>): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();

    // 1. Find uncategorized bank transactions with no existing pending action
    const { data: uncategorized, error: txError } = await supabase
      .from("bank_transactions")
      .select("id, description, counterpart_name, amount, booking_date")
      .eq("user_id", userId)
      .is("category", null)
      .order("booking_date", { ascending: false })
      .limit(50);

    if (txError) return { error: txError.message };
    if (!uncategorized || uncategorized.length === 0) {
      return { error: null, data: { created: 0 } };
    }

    // 2. Check which transactions already have pending actions
    const txIds = uncategorized.map((tx: { id: string }) => tx.id);
    const { data: existingActions } = await supabase
      .from("action_feed")
      .select("related_transaction_id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .in("related_transaction_id", txIds);

    const existingTxIds = new Set(
      (existingActions ?? []).map((a: { related_transaction_id: string | null }) => a.related_transaction_id)
    );

    // 3. Batch-fetch all potentially matching receipts (±3 days from any transaction)
    const filteredTxs = uncategorized.filter((tx: { id: string }) => !existingTxIds.has(tx.id));
    const txDates = filteredTxs.map((tx: { booking_date: string }) => new Date(tx.booking_date));
    const minDate = new Date(Math.min(...txDates.map((d: Date) => d.getTime())));
    minDate.setDate(minDate.getDate() - 3);
    const maxDate = new Date(Math.max(...txDates.map((d: Date) => d.getTime())));
    maxDate.setDate(maxDate.getDate() + 3);

    const [{ data: allReceipts }, { data: previousCategories }] = await Promise.all([
      supabase
        .from("receipts")
        .select("id, vendor_name, amount_inc_vat, category, receipt_date")
        .eq("user_id", userId)
        .gte("receipt_date", minDate.toISOString().split("T")[0])
        .lte("receipt_date", maxDate.toISOString().split("T")[0]),
      // Batch-fetch known categories for counterpart names (learn from history)
      supabase
        .from("bank_transactions")
        .select("counterpart_name, category")
        .eq("user_id", userId)
        .not("category", "is", null)
        .not("counterpart_name", "is", null),
    ]);

    const receipts = allReceipts ?? [];
    const knownCounterparts = new Set(
      (previousCategories ?? []).map((p: { counterpart_name: string }) => p.counterpart_name)
    );

    // 4. Match transactions to receipts in-memory
    const newActions: Partial<ActionFeedItem>[] = [];

    for (const tx of filteredTxs) {
      const txAmount = Math.abs(Number(tx.amount));
      const txDate = new Date(tx.booking_date);
      const dateFrom = new Date(txDate);
      dateFrom.setDate(dateFrom.getDate() - 3);
      const dateTo = new Date(txDate);
      dateTo.setDate(dateTo.getDate() + 3);

      const matchingReceipt = receipts.find(
        (r: { amount_inc_vat: number; receipt_date: string }) => {
          const rd = new Date(r.receipt_date);
          return rd >= dateFrom && rd <= dateTo && Math.abs(Number(r.amount_inc_vat) - txAmount) < 0.01;
        }
      );

      if (matchingReceipt) {
        let confidence = 0.85;
        const receiptDate = new Date(matchingReceipt.receipt_date);
        const daysDiff = Math.abs((txDate.getTime() - receiptDate.getTime()) / (1000 * 3600 * 24));

        if (daysDiff <= 1) confidence += 0.05;
        if (matchingReceipt.vendor_name && tx.counterpart_name?.toLowerCase().includes(matchingReceipt.vendor_name.toLowerCase())) confidence += 0.05;

        if (tx.counterpart_name && knownCounterparts.has(tx.counterpart_name)) confidence += 0.05;

        if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_EXECUTE) {
          // Autonomous match
          await supabase
            .from("bank_transactions")
            .update({
              category: matchingReceipt.category || "Algemeen",
              linked_receipt_id: matchingReceipt.id,
            })
            .eq("id", tx.id);

          newActions.push({
            user_id: userId,
            type: "autonomous_match",
            title: `Autonome Match: ${matchingReceipt.vendor_name}`,
            description: `AI heeft deze transactie automatisch gekoppeld aan een bon (${Math.round(confidence * 100)}% zekerheid).`,
            amount: txAmount,
            related_transaction_id: tx.id,
            related_receipt_id: matchingReceipt.id,
            suggested_category: matchingReceipt.category,
            ai_confidence: confidence,
            status: "resolved",
          });
        } else {
          const matchTitle = `Match: ${tx.counterpart_name ?? tx.description ?? "Onbekend"}`;
          const matchDesc = `Transactie van ${new Date(tx.booking_date).toLocaleDateString("nl-NL")} lijkt te passen bij bon van ${matchingReceipt.vendor_name ?? "onbekend"}.`;
          newActions.push({
            user_id: userId,
            type: "match_suggestion",
            title: toHumanReviewTitle(matchTitle, confidence),
            description: toHumanReviewDescription(matchDesc, confidence),
            amount: txAmount,
            related_transaction_id: tx.id,
            related_receipt_id: matchingReceipt.id,
            suggested_category: matchingReceipt.category,
            ai_confidence: confidence,
          });
        }
      } else {
        const uncatTitle = tx.counterpart_name ?? tx.description ?? "Onbekende transactie";
        const uncatDesc = `Afschrijving op ${new Date(tx.booking_date).toLocaleDateString("nl-NL")}. Categoriseer of negeer.`;
        newActions.push({
          user_id: userId,
          type: "uncategorized",
          title: toHumanReviewTitle(uncatTitle, 0),
          description: toHumanReviewDescription(uncatDesc, 0),
          amount: txAmount,
          related_transaction_id: tx.id,
          ai_confidence: 0,
        });
      }
    }

    if (newActions.length > 0) {
      const { error: insertError } = await supabase.from("action_feed").insert(newActions);
      if (insertError) return { error: insertError.message };

      // Audit trail: log elke agent-beslissing (fire-and-forget)
      for (const action of newActions) {
        const isAuto = action.status === "resolved";
        import("@/lib/audit/agent-audit").then((m) =>
          m.logAgentDecision({
            agentName: "ReconciliationAgent",
            actionType: isAuto ? "autonomous_action" : action.type === "match_suggestion" ? "match_suggestion" : "classification",
            userId,
            confidence: action.ai_confidence ?? 0,
            inputSummary: { transactionId: action.related_transaction_id, amount: action.amount },
            outputSummary: { type: action.type, category: action.suggested_category },
            wasAutoExecuted: isAuto,
          }).catch(() => {})
        );
      }
    }

    return { error: null, data: { created: newActions.length } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "reconciliation", userId } });
    return { error: getErrorMessage(err) };
  }
}
