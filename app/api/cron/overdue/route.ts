import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/use-cases/process-overdue-invoices";
import { processSubscriptionReminders } from "@/lib/use-cases/process-subscription-reminders";
import { processExpiredQuotes } from "@/lib/use-cases/process-expired-quotes";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";
import { withCronLock } from "@/lib/cron/lock";

/**
 * Cron: Overdue Invoice Handler + Subscription Reminders (daily 06:00)
 *
 * 1. Marks overdue invoices and sends escalating reminders to clients
 * 2. Sends escalating reminders for failed subscription payments
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locked = await withCronLock("overdue", async () => {
  try {
    const [overdueData, subscriptionData, expiredQuotesData] = await Promise.all([
      processOverdueInvoices(),
      processSubscriptionReminders(),
      processExpiredQuotes(),
    ]);

    // Log cron run
    const supabase = createServiceClient();
    await supabase.from("system_events").insert({
      event_type: "cron.overdue",
      payload: {
        overdue_updated: overdueData.updated,
        subscription_reminders_processed: subscriptionData.processed,
        subscription_emails_sent: subscriptionData.results.filter((r) => r.emailSent).length,
        expired_quotes_processed: expiredQuotesData.processed,
        expired_quotes_actions_created: expiredQuotesData.actionsCreated,
      },
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      overdue: overdueData,
      subscriptionReminders: subscriptionData,
      expiredQuotes: expiredQuotesData,
    });
  } catch (e: unknown) {
    await alertCronFailure("overdue", e);
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
  });

  if (locked === null) {
    return NextResponse.json({ status: "skipped", reason: "Job is al actief" });
  }
  return locked;
}
