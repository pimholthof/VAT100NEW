import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { gocardless } from "@/lib/banking/gocardless";
import * as Sentry from "@sentry/nextjs";

/**
 * Cron: Sync bank transactions for all active connections (daily 05:00).
 * Uses the service client — no user session needed.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all active bank connections
  const { data: connections, error: connError } = await supabase
    .from("bank_connections")
    .select("id, user_id, account_id, institution_name")
    .eq("status", "active")
    .not("account_id", "is", null);

  if (connError) {
    return NextResponse.json({ error: connError.message }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ synced: 0, results: [] });
  }

  const results: Array<{
    connectionId: string;
    userId: string;
    transactions: number;
    error?: string;
  }> = [];

  // Process connections sequentially to respect GoCardless rate limits
  for (const conn of connections) {
    try {
      const response = await gocardless.getTransactions(conn.account_id!);
      const booked = response.transactions?.booked || [];

      const newTransactions = booked.map(
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
        }) => ({
          user_id: conn.user_id,
          bank_connection_id: conn.id,
          external_id: t.internalTransactionId || t.transactionId,
          amount: parseFloat(t.transactionAmount.amount),
          currency: t.transactionAmount.currency,
          description:
            t.remittanceInformationUnstructured ||
            t.additionalInformation ||
            "",
          counterpart_name: t.debtorName || t.creditorName || "",
          counterpart_iban:
            t.debtorAccount?.iban || t.creditorAccount?.iban || "",
          booking_date: t.bookingDate || t.valueDate,
          status: "booked",
        })
      );

      if (newTransactions.length > 0) {
        const { error: upsertError } = await supabase
          .from("bank_transactions")
          .upsert(newTransactions, { onConflict: "external_id" });

        if (upsertError) {
          results.push({
            connectionId: conn.id,
            userId: conn.user_id,
            transactions: 0,
            error: upsertError.message,
          });
          continue;
        }
      }

      // Update last_synced_at
      await supabase
        .from("bank_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", conn.id);

      results.push({
        connectionId: conn.id,
        userId: conn.user_id,
        transactions: newTransactions.length,
      });
    } catch (e) {
      Sentry.captureException(e, {
        tags: { cron: "bank-sync", connectionId: conn.id, userId: conn.user_id },
      });
      results.push({
        connectionId: conn.id,
        userId: conn.user_id,
        transactions: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const totalSynced = results.reduce((sum, r) => sum + r.transactions, 0);

  return NextResponse.json({
    synced: totalSynced,
    connections: results.length,
    results,
  });
}
