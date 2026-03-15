import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import type { InvoiceData } from "@/lib/types";

/**
 * Cron: Overdue Invoice Handler (daily 06:00)
 * 
 * 1. Marks all unpaid invoices past due_date as "overdue"
 * 2. Automatically sends a reminder email for each newly overdue invoice
 * 3. Creates an action_feed item so the user sees it on their dashboard
 */
export async function GET(request: NextRequest) {
  // Support both header formats (Vercel Cron uses Authorization: Bearer)
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const secret = cronHeader || authHeader?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // 1. Find and mark overdue invoices
  const { data: overdueInvoices, error } = await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", today)
    .select("id, user_id, invoice_number, client_id, total_inc_vat, due_date, issue_date, subtotal_ex_vat, vat_amount");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    invoiceNumber: string;
    emailSent: boolean;
    actionCreated: boolean;
    error?: string;
  }> = [];

  // 2. For each newly overdue invoice: send reminder + create action item
  for (const inv of overdueInvoices ?? []) {
    let emailSent = false;
    let actionCreated = false;
    let errorMsg: string | undefined;

    try {
      // Get full invoice data for email
      const [clientResult, profileResult, itemsResult] = await Promise.all([
        supabase.from("clients").select("*").eq("id", inv.client_id).single(),
        supabase.from("profiles").select("*").eq("id", inv.user_id).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", inv.id),
      ]);

      if (clientResult.data && profileResult.data && clientResult.data.email) {
        const invoiceData: InvoiceData = {
          invoice: {
            ...inv,
            status: "overdue" as const,
          } as InvoiceData["invoice"],
          lines: (itemsResult.data ?? []) as InvoiceData["lines"],
          client: clientResult.data as InvoiceData["client"],
          profile: profileResult.data as InvoiceData["profile"],
        };

        const emailResult = await sendReminderEmail(invoiceData);
        emailSent = !emailResult.error;
        if (emailResult.error) {
          errorMsg = emailResult.error;
        }
      }

      // 3. Create action_feed item
      await supabase.from("action_feed").insert({
        user_id: inv.user_id,
        type: "tax_alert",
        title: `Factuur ${inv.invoice_number} is verlopen`,
        description: `Factuur ${inv.invoice_number} (${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(inv.total_inc_vat)}) is verlopen. ${emailSent ? "Een herinnering is automatisch verstuurd." : "Stuur handmatig een herinnering."}`,
        amount: inv.total_inc_vat,
        ai_confidence: 1.0,
      });
      actionCreated = true;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Unknown error";
    }

    results.push({
      invoiceNumber: inv.invoice_number,
      emailSent,
      actionCreated,
      error: errorMsg,
    });
  }

  return NextResponse.json({
    date: today,
    updated: overdueInvoices?.length ?? 0,
    results,
  });
}
