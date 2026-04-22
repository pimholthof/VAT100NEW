import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { isRateLimited } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";
import { todayIso } from "@/lib/utils/date-helpers";
import { bankingClient } from "@/lib/banking/tink";
import { autoCategorizeTransactionsInternal } from "@/features/banking/actions";
import { recalculateReserves } from "@/lib/services/reserve-recalculator";
import { autoReconcilePayments } from "@/lib/services/payment-reconciliation";
import { autoMatchReceipts } from "@/lib/services/receipt-matcher";
import { autoBookInvoice, autoBookReceipt } from "@/features/ledger/actions";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";
import { withCronLock } from "@/lib/cron/lock";

/**
 * Cron: Bank Sync (dagelijks 07:00 UTC)
 *
 * FASE 1 — Sync: Haalt transacties op van Tink en slaat ze op.
 * FASE 2 — Process: Categoriseer, reconcilieer, en boek automatisch.
 *
 * Fase 2 faalt onafhankelijk van fase 1: een categorisatie-fout
 * blokkeert geen reconciliatie of ledger posting.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense in depth against leaked cron secret. Daily schedule; 5/hour is ample.
  if (await isRateLimited("cron:sync-bank", 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const locked = await withCronLock("sync-bank", async () => {
  const supabase = createServiceClient();
  const errors: { connectionId: string; error: string }[] = [];
  let totalSynced = 0;
  let totalCategorized = 0;
  let totalReconciled = 0;
  let totalReceiptsMatched = 0;

  try {
    // 1. Haal alle actieve bankverbindingen op
    const { data: connections, error: connError } = await supabase
      .from("bank_connections")
      .select("id, user_id, account_id, last_synced_at, last_synced_booking_date")
      .eq("status", "active")
      .not("account_id", "is", null);

    if (connError) {
      return NextResponse.json(
        { error: connError.message },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ synced: 0, categorized: 0, errors: [] });
    }

    // 2. Per connectie: sync + process
    for (const connection of connections) {
      try {
        // Rate limiting: 1 seconde tussen connecties
        if (connections.indexOf(connection) > 0) {
          await new Promise((r) => setTimeout(r, 1000));
        }

        // ── FASE 1: Sync transacties van Tink ──
        const syncResult = await syncConnection(supabase, connection);
        totalSynced += syncResult.synced;

        // ── FASE 2: Process (onafhankelijk van sync succes) ──
        const processResult = await processConnection(supabase, connection);
        totalCategorized += processResult.categorized;
        totalReconciled += processResult.reconciled;
        totalReceiptsMatched += processResult.receiptsMatched;
      } catch (err) {
        errors.push({ connectionId: connection.id, error: getErrorMessage(err) });
        Sentry.captureException(err, {
          tags: { area: "cron.bank_sync", connectionId: connection.id },
          extra: { userId: connection.user_id },
        });
      }
    }

    // 3. Log resultaat
    await supabase.from("system_events").insert({
      event_type: "cron.bank_sync",
      payload: {
        connections_processed: connections.length,
        transactions_synced: totalSynced,
        transactions_categorized: totalCategorized,
        invoices_reconciled: totalReconciled,
        receipts_matched: totalReceiptsMatched,
        errors: errors.length,
      },
    });

    return NextResponse.json({
      synced: totalSynced,
      categorized: totalCategorized,
      reconciled: totalReconciled,
      connections: connections.length,
      errors,
    });
  } catch (e: unknown) {
    await alertCronFailure("sync-bank", e, { totalSynced, totalCategorized, totalReconciled });
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
  }, 15); // 15 min TTL

  if (locked === null) {
    return NextResponse.json({ status: "skipped", reason: "Job is al actief" });
  }
  return locked;
}

// ─── FASE 1: Sync ───

type BankConnection = {
  id: string;
  user_id: string;
  account_id: string;
  last_synced_at: string | null;
  last_synced_booking_date: string | null;
};

async function syncConnection(
  supabase: ReturnType<typeof createServiceClient>,
  connection: BankConnection
): Promise<{ synced: number }> {
  // Delta-sync: gebruik de meest recente booking_date als cursor
  // Dit is preciezer dan last_synced_at (timestamp van de sync-run zelf)
  const dateFrom = connection.last_synced_booking_date
    ?? (connection.last_synced_at
      ? new Date(connection.last_synced_at).toISOString().split("T")[0]
      : undefined);

  const response = await bankingClient.getTransactions(
    connection.account_id,
    dateFrom
  );
  const booked = response.transactions.booked || [];

  if (booked.length === 0) {
    await supabase
      .from("bank_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);
    return { synced: 0 };
  }

  // Map naar DB schema
  const newTransactions = booked.flatMap(
    (t: {
      internalTransactionId?: string;
      transactionId?: string;
      transactionAmount: { amount: string; currency: string };
      remittanceInformationUnstructured?: string;
      additionalInformation?: string;
      debtorName?: string;
      creditorName?: string;
      debtorAccount?: { iban?: string };
      creditorAccount?: { iban?: string };
      bookingDate?: string;
      valueDate?: string;
    }) => {
      const externalId = t.internalTransactionId || t.transactionId;
      const bookingDate = t.bookingDate || t.valueDate;
      const amount = Number.parseFloat(t.transactionAmount.amount);

      if (!externalId || !bookingDate || !Number.isFinite(amount)) {
        return [];
      }

      return [
        {
          user_id: connection.user_id,
          bank_connection_id: connection.id,
          external_id: externalId,
          amount,
          currency: t.transactionAmount.currency,
          description:
            t.remittanceInformationUnstructured ||
            t.additionalInformation ||
            "",
          counterpart_name: t.debtorName || t.creditorName || "",
          counterpart_iban:
            t.debtorAccount?.iban || t.creditorAccount?.iban || "",
          booking_date: bookingDate,
        },
      ];
    }
  );

  // Upsert in chunks
  const CHUNK_SIZE = 100;
  for (let i = 0; i < newTransactions.length; i += CHUNK_SIZE) {
    const chunk = newTransactions.slice(i, i + CHUNK_SIZE);
    const { error: upsertError } = await supabase
      .from("bank_transactions")
      .upsert(chunk, { onConflict: "external_id" });

    if (upsertError) {
      throw new Error(`Upsert fout: ${upsertError.message}`);
    }
  }

  // Delta-sync: bewaar de meest recente booking_date als cursor
  const latestBookingDate = newTransactions.reduce((latest, t) => {
    return t.booking_date > latest ? t.booking_date : latest;
  }, newTransactions[0].booking_date);

  // "Magic Moment": Bij eerste sync, maak een proactieve suggestie
  if (!connection.last_synced_at && newTransactions.length > 0) {
    const firstTransaction = newTransactions[0];
    const absAmount = Math.abs(firstTransaction.amount);
    const counterpart = firstTransaction.counterpart_name || "onbekend";

    try {
      await supabase.from("action_feed").insert({
        user_id: connection.user_id,
        type: "match_suggestion",
        title: "Je eerste transactie is binnen!",
        description: `Ik zie een betaling van €${absAmount.toFixed(2)} van ${counterpart}. Zal ik deze aan een factuur koppelen?`,
        amount: absAmount,
        ai_confidence: 0.95,
        status: "pending",
        related_transaction_id: null,
      });
    } catch {
      // Non-fatal: magic moment is best-effort
    }
  }

  // Update sync cursors: zowel timestamp als booking_date cursor
  await supabase
    .from("bank_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_synced_booking_date: latestBookingDate,
    })
    .eq("id", connection.id);

  return { synced: newTransactions.length };
}

// ─── FASE 2: Process ───

async function processConnection(
  supabase: ReturnType<typeof createServiceClient>,
  connection: BankConnection
): Promise<{ categorized: number; reconciled: number; receiptsMatched: number }> {
  let categorized = 0;
  let reconciled = 0;
  let receiptsMatched = 0;

  // Stap 1: Categoriseer ongecategoriseerde transacties
  try {
    const { data: uncategorized } = await supabase
      .from("bank_transactions")
      .select("id")
      .eq("user_id", connection.user_id)
      .is("category", null)
      .order("booking_date", { ascending: false })
      .limit(20);

    if (uncategorized && uncategorized.length > 0) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", connection.user_id)
        .in("status", ["active", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const planId = subscription?.plan_id ?? "studio";

      const result = await autoCategorizeTransactionsInternal(
        uncategorized.map((t: { id: string }) => t.id),
        connection.user_id,
        planId,
        supabase
      );
      categorized = Object.keys(result).length;
    }
  } catch {
    // Non-fatal: categorisatie mag reconciliatie niet blokkeren
  }

  // Stap 2: Automatische betalingsreconciliatie
  let reconcileResult: Awaited<ReturnType<typeof autoReconcilePayments>> = { matched: 0, matches: [] };
  try {
    reconcileResult = await autoReconcilePayments(connection.user_id, supabase);
    reconciled = reconcileResult.matched;
  } catch {
    // Non-fatal
  }

  // Stap 3: Automatische bonnetjes-matching
  let matchResult = { matched: 0, suggestions: [] as Array<{ receiptId: string; confidence: number }> };
  try {
    matchResult = await autoMatchReceipts(connection.user_id, supabase);
    receiptsMatched = matchResult.matched;
  } catch {
    // Non-fatal
  }

  // Stap 4: Auto-ledger posting voor reconciled facturen
  try {
    for (const match of reconcileResult.matches) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, user_id, invoice_number, subtotal_ex_vat, vat_amount, vat_scheme")
        .eq("id", match.invoiceId)
        .single();

      const { data: transaction } = await supabase
        .from("bank_transactions")
        .select("booking_date")
        .eq("id", match.transactionId)
        .single();

      if (invoice && transaction) {
        const { count } = await supabase
          .from("ledger_entries")
          .select("id", { count: "exact", head: true })
          .eq("source_invoice_id", invoice.id);

        if (!count || count === 0) {
          await autoBookInvoice({
            invoiceId: invoice.id,
            userId: invoice.user_id,
            entryDate: transaction.booking_date ?? todayIso(),
            description: `Factuur betaling: ${invoice.invoice_number}`,
            subtotalExVat: invoice.subtotal_ex_vat,
            vatAmount: invoice.vat_amount ?? 0,
            vatScheme: invoice.vat_scheme ?? undefined,
            supabase: supabase as Parameters<typeof autoBookInvoice>[0]["supabase"],
          });
        }
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "cron.bank_sync.auto_ledger" } });
  }

  // Stap 5: Auto-ledger posting voor hoog-confidence receipt matches
  try {
    for (const match of matchResult.suggestions.filter((m) => m.confidence >= 0.9)) {
      const { data: receipt } = await supabase
        .from("receipts")
        .select("id, user_id, vendor_name, amount_ex_vat, vat_amount, cost_code, business_percentage, category")
        .eq("id", match.receiptId)
        .single();

      if (receipt) {
        const { count } = await supabase
          .from("ledger_entries")
          .select("id", { count: "exact", head: true })
          .eq("source_receipt_id", receipt.id);

        if (!count || count === 0) {
          await autoBookReceipt({
            receiptId: receipt.id,
            userId: receipt.user_id,
            entryDate: todayIso(),
            description: receipt.vendor_name ?? "Onbekende leverancier",
            costCode: receipt.cost_code ?? 4999,
            amountExVat: receipt.amount_ex_vat ?? 0,
            vatAmount: receipt.vat_amount ?? 0,
            businessPercentage: receipt.business_percentage ?? 100,
            category: receipt.category ?? null,
            supabase: supabase as Parameters<typeof autoBookReceipt>[0]["supabase"],
          });
        }
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "cron.bank_sync.auto_ledger_receipts" } });
  }

  // Reserve herberekening (fire-and-forget)
  recalculateReserves(connection.user_id, "sync").catch(() => {});

  return { categorized, reconciled, receiptsMatched };
}
