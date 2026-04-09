import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/use-cases/process-overdue-invoices";
import { processSubscriptionReminders } from "@/lib/use-cases/process-subscription-reminders";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { createServiceClient } from "@/lib/supabase/service";

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

  try {
    const [overdueData, subscriptionData] = await Promise.all([
      processOverdueInvoices(),
      processSubscriptionReminders(),
    ]);

    // Log cron run
    const supabase = createServiceClient();
    await supabase.from("system_events").insert({
      event_type: "cron.overdue",
      payload: {
        overdue_updated: overdueData.updated,
        subscription_reminders_processed: subscriptionData.processed,
        subscription_emails_sent: subscriptionData.results.filter((r) => r.emailSent).length,
      },
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      overdue: overdueData,
      subscriptionReminders: subscriptionData,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
