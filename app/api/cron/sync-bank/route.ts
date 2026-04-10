import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { createServiceClient } from "@/lib/supabase/service";
import { bankingClient } from "@/lib/banking/tink";
import { autoCategorizeTransactionsInternal } from "@/features/banking/actions";
import { recalculateReserves } from "@/lib/services/reserve-recalculator";
import { autoReconcilePayments } from "@/lib/services/payment-reconciliation";
import { autoMatchReceipts } from "@/lib/services/receipt-matcher";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";
import { withCronLock } from "@/lib/cron/lock";

/**
 * Cron: Bank Sync (dagelijks 07:00 UTC)
 *
 * Haalt automatisch nieuwe transacties op voor alle actieve bankverbindingen,
 * categoriseert ze via de managed agent, en triggert reserve-herberekening.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      .select("id, user_id, account_id, last_synced_at")
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

    // 2. Per connectie: sync transacties
    for (const connection of connections) {
      try {
        // Rate limiting: 1 seconde tussen connecties
        if (connections.indexOf(connection) > 0) {
          await new Promise((r) => setTimeout(r, 1000));
        }

        // Haal transacties op sinds laatste sync
        const dateFrom = connection.last_synced_at
          ? new Date(connection.last_synced_at).toISOString().split("T")[0]
          : undefined;

        const response = await bankingClient.getTransactions(
          connection.account_id,
          dateFrom
        );
        const booked = response.transactions.booked || [];

        if (booked.length === 0) {
          // Update last_synced_at ook als er geen nieuwe transacties zijn
          await supabase
            .from("bank_connections")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", connection.id);
          continue;
        }

        // Map naar DB schema (zelfde mapping als syncTransactions)
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

        totalSynced += newTransactions.length;

        // Update last_synced_at
        await supabase
          .from("bank_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connection.id);

        // Categoriseer ongecategoriseerde transacties
        const { data: uncategorized } = await supabase
          .from("bank_transactions")
          .select("id")
          .eq("user_id", connection.user_id)
          .is("category", null)
          .order("booking_date", { ascending: false })
          .limit(20);

        if (uncategorized && uncategorized.length > 0) {
          // Bepaal plan-tier voor deze user
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("plan_id")
            .eq("user_id", connection.user_id)
            .in("status", ["active", "past_due"])
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const planId = subscription?.plan_id ?? "studio";

          try {
            const categorized = await autoCategorizeTransactionsInternal(
              uncategorized.map((t: { id: string }) => t.id),
              connection.user_id,
              planId,
              supabase
            );
            totalCategorized += Object.keys(categorized).length;
          } catch {
            // Non-fatal: categorisatie mag de sync niet blokkeren
          }
        }

        // Automatische betalingsreconciliatie
        try {
          const reconcileResult = await autoReconcilePayments(
            connection.user_id,
            supabase
          );
          totalReconciled += reconcileResult.matched;
        } catch {
          // Non-fatal: reconciliatie mag de sync niet blokkeren
        }

        // Automatische bonnetjes-matching
        try {
          const matchResult = await autoMatchReceipts(connection.user_id, supabase);
          totalReceiptsMatched += matchResult.matched;
        } catch {
          // Non-fatal
        }

        // Reserve herberekening (fire-and-forget)
        recalculateReserves(connection.user_id, "sync").catch(() => {});
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ connectionId: connection.id, error: message });
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
    const message = e instanceof Error ? e.message : String(e);
    await alertCronFailure("sync-bank", e, { totalSynced, totalCategorized, totalReconciled });
    return NextResponse.json({ error: message }, { status: 500 });
  }
  }, 15); // 15 min TTL

  if (locked === null) {
    return NextResponse.json({ status: "skipped", reason: "Job is al actief" });
  }
  return locked;
}
