import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { getErrorMessage } from "@/lib/utils/errors";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";
import { withCronLock } from "@/lib/cron/lock";

function calculateNextRunDate(runDate: string, frequency: string): string {
  const nextDate = new Date(runDate);
  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  return nextDate.toISOString().split("T")[0];
}

/**
 * Cron job: Process recurring invoices.
 * Runs daily, finds templates where next_run_date <= today, generates invoices.
 * Uses a single transactional RPC for atomicity and idempotency.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locked = await withCronLock("recurring", async () => {
  try {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Find all active recurring invoices due today or earlier
  const { data: templates, error: fetchError } = await supabase
    .from("recurring_invoices")
    .select("*, lines:recurring_invoice_lines(*), client:clients(name, email)")
    .eq("is_active", true)
    .lte("next_run_date", today);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const results: Array<{ templateId: string; invoiceId?: string; error?: string }> = [];

  for (const template of templates ?? []) {
    try {
      const runDate = template.next_run_date;
      const nextRunDate = calculateNextRunDate(runDate, template.frequency);

      // Generate invoice number
      const { data: invoiceNumber, error: rpcError } = await supabase.rpc(
        "generate_invoice_number",
        { p_user_id: template.user_id }
      );

      if (rpcError) {
        results.push({ templateId: template.id, error: rpcError.message });
        continue;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Atomic RPC call: handles idempotency, invoice creation, line copying, and template update
      const { data: invoiceId, error: genError } = await supabase.rpc(
        "generate_recurring_invoice",
        {
          p_template_id: template.id,
          p_run_date: runDate,
          p_next_run_date: nextRunDate,
          p_invoice_number: invoiceNumber,
          p_today: today,
          p_due_date: dueDate.toISOString().split("T")[0],
        }
      );

      if (genError) {
        results.push({ templateId: template.id, error: genError.message });
        continue;
      }

      results.push({ templateId: template.id, invoiceId });
    } catch (e) {
      results.push({
        templateId: template.id,
        error: getErrorMessage(e),
      });
    }
  }

  await supabase.from("system_events").insert({
    event_type: "cron.recurring",
    payload: {
      processed: results.length,
      generated: results.filter((result) => result.invoiceId).length,
      errors: results.filter((result) => result.error).length,
    },
    processed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    processed: results.length,
    results,
  });
  } catch (e: unknown) {
    await alertCronFailure("recurring", e);
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
  });

  if (locked === null) {
    return NextResponse.json({ status: "skipped", reason: "Job is al actief" });
  }
  return locked;
}
