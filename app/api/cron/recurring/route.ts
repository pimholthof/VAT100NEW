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

      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("source_recurring_invoice_id", template.id)
        .eq("source_run_date", runDate)
        .maybeSingle();

      if (existingInvoice?.id) {
        await supabase
          .from("recurring_invoices")
          .update({
            next_run_date: nextRunDate,
            last_generated_at: new Date().toISOString(),
          })
          .eq("id", template.id);

        results.push({ templateId: template.id, invoiceId: existingInvoice.id });
        continue;
      }

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

      // Create invoice
      const { data: invoice, error: insertError } = await supabase
        .from("invoices")
        .insert({
          user_id: template.user_id,
          client_id: template.client_id,
          source_recurring_invoice_id: template.id,
          source_run_date: runDate,
          invoice_number: invoiceNumber as string,
          status: template.auto_send ? "sent" : "draft",
          issue_date: today,
          due_date: dueDate.toISOString().split("T")[0],
          vat_rate: template.vat_rate,
          subtotal_ex_vat: subtotal,
          vat_amount: vatAmount,
          total_inc_vat: total,
          notes: template.notes,
        })
        .select("id")
        .single();

      if (insertError || !invoice) {
        if (insertError?.code === "23505") {
          const { data: duplicateInvoice } = await supabase
            .from("invoices")
            .select("id")
            .eq("source_recurring_invoice_id", template.id)
            .eq("source_run_date", runDate)
            .maybeSingle();

          if (duplicateInvoice?.id) {
            await supabase
              .from("recurring_invoices")
              .update({
                next_run_date: nextRunDate,
                last_generated_at: new Date().toISOString(),
              })
              .eq("id", template.id);

            results.push({ templateId: template.id, invoiceId: duplicateInvoice.id });
            continue;
          }
        }

        results.push({ templateId: template.id, error: insertError?.message ?? "Insert failed" });
        continue;
      }

      // Copy lines
      if (lines.length > 0) {
        const { error: linesError } = await supabase.from("invoice_lines").insert(
          lines.map((l, i) => ({
            invoice_id: invoice.id,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            rate: l.rate,
            amount: l.amount,
            sort_order: i,
          }))
        );

        if (linesError) {
          // Rollback: verwijder de factuur als regels falen
          await supabase.from("invoices").delete().eq("id", invoice.id);
          results.push({ templateId: template.id, error: `Regels mislukt: ${linesError.message}` });
          continue;
        }
      }

      await supabase
        .from("recurring_invoices")
        .update({
          next_run_date: nextRunDate,
          last_generated_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      results.push({ templateId: template.id, invoiceId: invoice.id });
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
