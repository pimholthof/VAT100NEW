"use server";

import { requireAuth, createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionFeedItem } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";
import { sendReminder } from "@/features/invoices/actions";
import { formatCurrency } from "@/lib/format";
import { calculateZZPTaxProjection, type Investment } from "@/lib/tax/dutch-tax-2026";
import {
  CONFIDENCE_THRESHOLDS,
  calculateInvestmentTaxSaving,
  calculateKIAThresholdGap,
  generateKIAThresholdDescription,
  generateInvestmentSuggestionDescription,
  toHumanReviewTitle,
  toHumanReviewDescription,
  getMissingReceiptConfidence,
} from "@/lib/tax/fiscal-claim-validator";
import * as Sentry from "@sentry/nextjs";

/**
 * Fetch all pending action items for the current user (the "Inbox").
 */
export async function getActionFeedItems(): Promise<ActionResult<ActionFeedItem[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("action_feed")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { error: null, data: (data as ActionFeedItem[]) ?? [] };
}

/**
 * Resolve an action item (confirm match, send reminder, etc.)
 */
export async function resolveActionItem(
  itemId: string,
  category?: string,
  draftContent?: string
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(itemId);
  if (!idCheck.success) return { error: "Ongeldig actie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // 1. Get the item to perform the specific action (filter by user_id for security)
  const { data: item } = await supabase
    .from("action_feed")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (!item) return { error: "Actie niet gevonden." };

  // 2. Perform type-specific action
  if (item.type === "reminder_suggestion" && item.related_invoice_id) {
    const res = await sendReminder(item.related_invoice_id, draftContent || item.draft_content);
    if (res.error) return { error: res.error };
  }

  // Payment match: mark invoice as paid and link transaction
  if (item.type === "match_suggestion" && item.related_invoice_id && item.related_transaction_id) {
    await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", item.related_invoice_id)
      .eq("user_id", user.id);

    await supabase
      .from("bank_transactions")
      .update({ linked_invoice_id: item.related_invoice_id })
      .eq("id", item.related_transaction_id)
      .eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("action_feed")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  // If a category was provided and there's a related transaction, categorize it
  if (!error && category && item.related_transaction_id) {
    await supabase
      .from("bank_transactions")
      .update({ category })
      .eq("id", item.related_transaction_id)
      .eq("user_id", user.id);

    // Reserve herberekening na classificatie (fire-and-forget)
    import("@/lib/services/reserve-recalculator").then((m) =>
      m.recalculateReserves(user.id, "classification", item.related_transaction_id).catch(() => {})
    );
  }

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Ignore an action item (user decided this is irrelevant).
 */
export async function ignoreActionItem(itemId: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(itemId);
  if (!idCheck.success) return { error: "Ongeldig actie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("action_feed")
    .update({
      status: "ignored",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

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
    return { error: err instanceof Error ? err.message : "Unknown error in reconciliation agent" };
  }
}

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
    return { error: err instanceof Error ? err.message : "Unknown error in payment detection agent" };
  }
}

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  total_inc_vat: number;
  due_date: string;
  client: { name: string } | null;
}

/**
 * Agent 3: The Anticipation Engine.
 */
export async function runAnticipationAgent(userId: string, externalSupabase?: Awaited<ReturnType<typeof createClient>>): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: overdue, error: invError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_inc_vat, due_date, client:clients(name)")
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10) as { data: OverdueInvoice[] | null; error: { message: string } | null };

    if (invError) return { error: invError.message };
    if (!overdue || overdue.length === 0) return { error: null, data: { created: 0 } };

    const invoiceIds = overdue.map((inv) => inv.id);
    const { data: existingActions } = await supabase
      .from("action_feed")
      .select("related_invoice_id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .eq("type", "reminder_suggestion")
      .in("related_invoice_id", invoiceIds);

    const existingInvoiceIds = new Set((existingActions ?? []).map((a) => a.related_invoice_id));
    const newActions: Partial<ActionFeedItem>[] = [];

    for (const inv of overdue) {
      if (existingInvoiceIds.has(inv.id)) continue;

      const clientName = inv.client?.name ?? "Onbekende klant";
      const amount = formatCurrency(inv.total_inc_vat);
      const dueTime = new Date(inv.due_date).getTime();
      const nowTime = new Date(today).getTime();
      const daysOverdue = Math.floor((nowTime - dueTime) / (1000 * 3600 * 24));

      if (daysOverdue < 2) continue;

      const draft = `Beste ${clientName},\n\nUit mijn administratie blijkt dat factuur ${inv.invoice_number} (${amount}) nog niet is voldaan. Zou je dit kunnen controleren?\n\nMet vriendelijke groet,\nDe boekhoudbot`;

      newActions.push({
        user_id: userId,
        type: "reminder_suggestion",
        title: `Betaling herinneren: ${clientName}`,
        description: `Factuur ${inv.invoice_number} (${amount}) is verlopen sinds ${new Date(inv.due_date).toLocaleDateString("nl-NL")}.`,
        amount: inv.total_inc_vat,
        draft_content: draft,
        related_invoice_id: inv.id,
        ai_confidence: 0.98,
        status: "pending"
      });
    }

    if (newActions.length > 0) {
      const { error: insertError } = await supabase.from("action_feed").insert(newActions);
      if (insertError) return { error: insertError.message };

      // Audit trail
      for (const action of newActions) {
        import("@/lib/audit/agent-audit").then((m) =>
          m.logAgentDecision({
            agentName: "AnticipationAgent",
            actionType: "tax_alert",
            userId,
            confidence: action.ai_confidence ?? 0.98,
            inputSummary: { invoiceId: action.related_invoice_id, amount: action.amount },
            outputSummary: { type: action.type },
            wasAutoExecuted: false,
          }).catch(() => {})
        );
      }
    }

    return { error: null, data: { created: newActions.length } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "anticipation", userId } });
    return { error: err instanceof Error ? err.message : "Unknown error in anticipation agent" };
  }
}

/**
 * Agent 4: The Investment Agent (Tax Shield).
 * Now uses assets DB totals instead of scanning receipts by cost_code.
 */
export async function runInvestmentAgent(userId: string, externalSupabase?: Awaited<ReturnType<typeof createClient>>): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Fetch revenue
    const { data: profitData } = await supabase
      .from("invoices")
      .select("total_inc_vat, vat_amount")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("issue_date", yearStart);

    if (!profitData || profitData.length === 0) return { error: null, data: { created: 0 } };

    const totalRevenueExVat = profitData.reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) - Number(inv.vat_amount)), 0
    );

    // Fetch KIA-eligible investments from assets table (>= €450, this year)
    const { data: kiaAssets } = await supabase
      .from("assets")
      .select("aanschaf_prijs")
      .eq("user_id", userId)
      .gte("aanschaf_datum", yearStart)
      .lte("aanschaf_datum", yearEnd)
      .gte("aanschaf_prijs", 450);

    const totalInvestments = (kiaAssets ?? []).reduce(
      (sum, a) => sum + (Number(a.aanschaf_prijs) || 0), 0
    );

    // Check for existing pending tax alerts
    const { data: existing } = await supabase
      .from("action_feed")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "tax_alert")
      .eq("status", "pending");

    if (existing && existing.length > 0) return { error: null, data: { created: 0 } };

    let created = 0;

    // Alert 1: KIA threshold proximity — deterministic berekening
    const kiaGap = calculateKIAThresholdGap(totalInvestments);
    if (kiaGap && totalInvestments > 2500) {
      const confidence = 0.95;
      const title = toHumanReviewTitle("KIA-drempel bijna bereikt!", confidence);
      const description = toHumanReviewDescription(
        generateKIAThresholdDescription(totalInvestments, kiaGap),
        confidence,
      );
      await supabase.from("action_feed").insert({
        user_id: userId,
        type: "tax_alert",
        title,
        description,
        ai_confidence: confidence,
        status: "pending",
      });
      // Audit trail
      import("@/lib/audit/agent-audit").then((m) =>
        m.logAgentDecision({
          agentName: "InvestmentAgent",
          actionType: "tax_alert",
          userId,
          confidence,
          inputSummary: { totalInvestments, kiaGapNodig: kiaGap.nodig },
          outputSummary: { type: "kia_threshold", potentialKIA: kiaGap.potentialKIA },
          wasAutoExecuted: false,
        }).catch(() => {})
      );
      created++;
    }

    // Alert 2: Investering-suggestie — bereken echte belastingbesparing
    if (totalRevenueExVat > 10000 && totalInvestments < 2901) {
      // Haal kosten op voor belastbaar inkomen berekening
      const { data: costsData } = await supabase
        .from("receipts")
        .select("amount_ex_vat")
        .eq("user_id", userId)
        .gte("receipt_date", yearStart)
        .lte("receipt_date", yearEnd);

      const jaarKostenExBtw = (costsData ?? []).reduce(
        (sum, rec) => sum + (Number(rec.amount_ex_vat) || 0), 0
      );

      const maandenVerstreken = now.getMonth() + 1;
      const projection = calculateZZPTaxProjection({
        jaarOmzetExBtw: totalRevenueExVat,
        jaarKostenExBtw,
        investeringen: (kiaAssets ?? []).map((a, i) => ({
          id: String(i),
          omschrijving: "Bestaande investering",
          aanschafprijs: Number(a.aanschaf_prijs) || 0,
          aanschafDatum: yearStart,
          levensduur: 5,
          restwaarde: 0,
        })) as Investment[],
        maandenVerstreken,
        huidigJaar: currentYear,
      });

      const proposedInvestment = 1000;
      const saving = calculateInvestmentTaxSaving({
        currentTotalInvestments: totalInvestments,
        proposedAdditionalInvestment: proposedInvestment,
        currentBelastbaarInkomen: projection.belastbaarInkomen,
      });

      const confidence = 0.9;
      const title = toHumanReviewTitle("Fiscale Optimalisatie: Investering", confidence);
      const description = toHumanReviewDescription(
        generateInvestmentSuggestionDescription(totalRevenueExVat, proposedInvestment, saving),
        confidence,
      );
      await supabase.from("action_feed").insert({
        user_id: userId,
        type: "tax_alert",
        title,
        description,
        ai_confidence: confidence,
        status: "pending",
      });
      // Audit trail
      import("@/lib/audit/agent-audit").then((m) =>
        m.logAgentDecision({
          agentName: "InvestmentAgent",
          actionType: "tax_alert",
          userId,
          confidence,
          inputSummary: { totalRevenueExVat, totalInvestments, proposedInvestment },
          outputSummary: { type: "investment_suggestion", kiaDelta: saving.kiaDelta, taxSaving: saving.taxSaving },
          wasAutoExecuted: false,
        }).catch(() => {})
      );
      created++;
    }

    return { error: null, data: { created } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "investment", userId } });
    return { error: err instanceof Error ? err.message : "Unknown error in investment agent" };
  }
}

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
    return { error: err instanceof Error ? err.message : "Unknown error in missing receipt detection" };
  }
}

/**
 * Agent 7: BTW Deadline Alert.
 * Maakt een actie-item aan wanneer de BTW-deadline binnen 14 dagen is
 * en er een draft BTW-aangifte klaarligt.
 */
export async function runBtwDeadlineAlert(
  userId: string,
  externalSupabase?: Awaited<ReturnType<typeof createClient>>
): Promise<ActionResult<{ created: boolean }>> {
  try {
    const supabase = externalSupabase || await createClient();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Bepaal volgende BTW-deadline
    const filingPeriods = [
      { quarter: 4, year: currentYear - 1, deadline: new Date(currentYear, 0, 31) },
      { quarter: 1, year: currentYear, deadline: new Date(currentYear, 3, 30) },
      { quarter: 2, year: currentYear, deadline: new Date(currentYear, 6, 31) },
      { quarter: 3, year: currentYear, deadline: new Date(currentYear, 9, 31) },
      { quarter: 4, year: currentYear, deadline: new Date(currentYear + 1, 0, 31) },
    ];

    const nextDeadline = filingPeriods.find((p) => p.deadline >= now);
    if (!nextDeadline) return { error: null, data: { created: false } };

    const daysUntil = Math.ceil(
      (nextDeadline.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Alleen alert als deadline binnen 14 dagen
    if (daysUntil > 14) return { error: null, data: { created: false } };

    // Check of er al een alert bestaat
    const { data: existing } = await supabase
      .from("action_feed")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "tax_alert")
      .eq("status", "pending")
      .like("title", `%BTW-aangifte Q${nextDeadline.quarter}%`)
      .limit(1);

    if (existing && existing.length > 0) return { error: null, data: { created: false } };

    // Check of er een draft aangifte klaarligt
    const { data: draft } = await supabase
      .from("vat_returns")
      .select("id, status")
      .eq("user_id", userId)
      .eq("year", nextDeadline.year)
      .eq("quarter", nextDeadline.quarter)
      .single();

    const hasDraft = draft?.status === "draft";
    const isLocked = draft?.status === "locked";

    let title: string;
    let description: string;

    if (isLocked) {
      title = `BTW-aangifte Q${nextDeadline.quarter} klaar voor indiening`;
      description = `Je BTW-aangifte is vergrendeld en klaar. Dien deze in bij de Belastingdienst vóór ${nextDeadline.deadline.toLocaleDateString("nl-NL")} (${daysUntil} dagen).`;
    } else if (hasDraft) {
      title = `BTW-aangifte Q${nextDeadline.quarter} reviewen`;
      description = `Je concept BTW-aangifte staat klaar. Review en vergrendel deze vóór ${nextDeadline.deadline.toLocaleDateString("nl-NL")} (${daysUntil} dagen).`;
    } else {
      title = `BTW-aangifte Q${nextDeadline.quarter} voorbereiden`;
      description = `De BTW-deadline is over ${daysUntil} dagen (${nextDeadline.deadline.toLocaleDateString("nl-NL")}). Ga naar Belasting om je aangifte voor te bereiden.`;
    }

    await supabase.from("action_feed").insert({
      user_id: userId,
      type: "tax_alert",
      title,
      description,
      ai_confidence: 1.0,
      status: "pending",
    });

    // Audit trail
    import("@/lib/audit/agent-audit").then((m) =>
      m.logAgentDecision({
        agentName: "BtwDeadlineAlert",
        actionType: "tax_alert",
        userId,
        confidence: 1.0,
        inputSummary: { quarter: nextDeadline.quarter, year: nextDeadline.year, daysUntil },
        outputSummary: { hasDraft, isLocked },
        wasAutoExecuted: false,
      }).catch(() => {})
    );

    return { error: null, data: { created: true } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "btw_deadline_alert", userId } });
    return { error: err instanceof Error ? err.message : "Unknown error in BTW deadline alert" };
  }
}

