import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Cron job: Process recurring invoices.
 * Runs daily, finds templates where next_run_date <= today, generates invoices.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        results.push({ templateId: template.id, error: insertError?.message ?? "Insert failed" });
        continue;
      }

      // Copy lines
      if (lines.length > 0) {
        await supabase.from("invoice_lines").insert(
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
      }

      // Calculate next run date
      const nextDate = new Date(template.next_run_date);
      switch (template.frequency) {
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

      await supabase
        .from("recurring_invoices")
        .update({
          next_run_date: nextDate.toISOString().split("T")[0],
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

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
