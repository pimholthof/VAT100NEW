import { createServiceClient } from "@/lib/supabase/service";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { formatCurrency } from "@/lib/format";
import type { InvoiceData } from "@/lib/types";

export async function processOverdueInvoices(userId?: string): Promise<{
  updated: number;
  results: Array<{
    invoiceNumber: string;
    emailSent: boolean;
    actionCreated: boolean;
    error?: string;
  }>;
}> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", today);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: overdueInvoices, error } = await query.select(
    "id, user_id, invoice_number, client_id, total_inc_vat, due_date, issue_date, subtotal_ex_vat, vat_amount"
  );

  if (error) throw new Error(error.message);

  const results: Array<{
    invoiceNumber: string;
    emailSent: boolean;
    actionCreated: boolean;
    error?: string;
  }> = [];

  for (const inv of overdueInvoices ?? []) {
    let emailSent = false;
    let actionCreated = false;
    let errorMsg: string | undefined;

    try {
      const { data: existingAction, error: existingActionError } = await supabase
        .from("action_feed")
        .select("id")
        .eq("user_id", inv.user_id)
        .eq("type", "tax_alert")
        .eq("related_invoice_id", inv.id)
        .limit(1)
        .maybeSingle();

      if (existingActionError) {
        throw new Error(existingActionError.message);
      }

      if (existingAction) {
        results.push({
          invoiceNumber: inv.invoice_number,
          emailSent: false,
          actionCreated: false,
        });
        continue;
      }

      const [clientResult, profileResult, itemsResult] = await Promise.all([
        supabase.from("clients").select("*").eq("id", inv.client_id).single(),
        supabase.from("profiles").select("*").eq("id", inv.user_id).single(),
        supabase.from("invoice_lines").select("*").eq("invoice_id", inv.id),
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
        if (emailResult.error) errorMsg = emailResult.error;
      }

      const { error: actionError } = await supabase.from("action_feed").insert({
        user_id: inv.user_id,
        type: "tax_alert",
        title: `Factuur ${inv.invoice_number} is verlopen`,
        description: `Factuur ${inv.invoice_number} (${formatCurrency(inv.total_inc_vat)}) is verlopen. ${emailSent ? "Een herinnering is automatisch verstuurd." : "Stuur handmatig een herinnering."}`,
        amount: inv.total_inc_vat,
        related_invoice_id: inv.id,
        ai_confidence: 1.0,
      });

      if (actionError) {
        throw new Error(actionError.message);
      }

      actionCreated = true;
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    results.push({
      invoiceNumber: inv.invoice_number,
      emailSent,
      actionCreated,
      error: errorMsg,
    });
  }

  return {
    updated: overdueInvoices?.length ?? 0,
    results,
  };
}
