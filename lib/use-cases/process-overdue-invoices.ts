import { createServiceClient } from "@/lib/supabase/service";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { formatCurrency } from "@/lib/format";
import * as Sentry from "@sentry/nextjs";
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

  // Process each overdue invoice concurrently with Promise.allSettled
  const settled = await Promise.allSettled(
    (overdueInvoices ?? []).map(async (inv) => {
      let emailSent = false;
      let actionCreated = false;

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
        return { invoiceNumber: inv.invoice_number, emailSent: false, actionCreated: false };
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

      if (actionError) throw new Error(actionError.message);
      actionCreated = true;

      return { invoiceNumber: inv.invoice_number, emailSent, actionCreated };
    })
  );

  const results = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const inv = overdueInvoices?.[index];
    const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
    Sentry.captureException(result.reason, {
      tags: { area: "overdue-processing" },
      extra: { invoiceId: inv?.id },
    });
    return {
      invoiceNumber: inv?.invoice_number ?? "onbekend",
      emailSent: false,
      actionCreated: false,
      error: errorMsg,
    };
  });

  return {
    updated: overdueInvoices?.length ?? 0,
    results,
  };
}
