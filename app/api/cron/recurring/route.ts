import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
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
 * Uses a single transactional RPC for atomicity.
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

      // Calculate totals
      const lines = (template.lines ?? []) as Array<{
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        amount: number;
        sort_order: number;
      }>;

      const subtotal = lines.reduce((sum, l) => sum + Number(l.amount), 0);
      const vatAmount = Math.round(subtotal * (Number(template.vat_rate) / 100) * 100) / 100;
      const total = Math.round((subtotal + vatAmount) * 100) / 100;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Atomic: create invoice + lines + update template in one transaction
      const { data: invoiceId, error: createError } = await supabase.rpc(
        "create_recurring_invoice",
        {
          p_user_id: template.user_id,
          p_client_id: template.client_id,
          p_template_id: template.id,
          p_run_date: runDate,
          p_invoice_number: invoiceNumber as string,
          p_status: template.auto_send ? "sent" : "draft",
          p_issue_date: today,
          p_due_date: dueDate.toISOString().split("T")[0],
          p_vat_rate: template.vat_rate,
          p_notes: template.notes,
          p_subtotal_ex_vat: subtotal,
          p_vat_amount: vatAmount,
          p_total_inc_vat: total,
          p_next_run_date: nextRunDate,
          p_lines: JSON.stringify(
            lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unit: l.unit,
              rate: l.rate,
              amount: l.amount,
            }))
          ),
        }
      );

      if (createError) {
        results.push({ templateId: template.id, error: createError.message });
        continue;
      }

      results.push({ templateId: template.id, invoiceId: invoiceId as string });
    } catch (e) {
      results.push({
        templateId: template.id,
        error: e instanceof Error ? e.message : "Unknown error",
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
    const message = e instanceof Error ? e.message : String(e);
    await alertCronFailure("recurring", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });

  if (locked === null) {
    return NextResponse.json({ status: "skipped", reason: "Job is al actief" });
  }
  return locked;
}
