import { createServiceClient } from "@/lib/supabase/service";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { formatCurrency } from "@/lib/format";
import * as Sentry from "@sentry/nextjs";
import type { InvoiceData } from "@/lib/types";
import { sendDefaultNotice } from "@/lib/email/send-default-notice";
import { calculateLegalInterest } from "@/lib/logic/interest-calculator";

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

  // Batch-fetch alle eerdere herinneringen vooraf (voorkomt N+1 in de loop).
  // Per factuur houden we de hoogste stap en het laatste verzenddatum bij, en
  // een set van alle gebruikte stappen zodat we dubbele ingebrekestellingen
  // (stap 4) kunnen detecteren zonder extra round-trip.
  const invoiceIds = (overdueInvoices ?? []).map((inv) => inv.id);
  const reminderMap = new Map<
    string,
    { lastStep: number; lastSentAt: string | null; steps: Set<number> }
  >();

  if (invoiceIds.length > 0) {
    const { data: allReminders } = await supabase
      .from("invoice_reminders")
      .select("invoice_id, step, sent_at")
      .in("invoice_id", invoiceIds);

    for (const r of allReminders ?? []) {
      const existing = reminderMap.get(r.invoice_id);
      if (!existing) {
        reminderMap.set(r.invoice_id, {
          lastStep: r.step,
          lastSentAt: r.sent_at,
          steps: new Set([r.step]),
        });
      } else {
        existing.steps.add(r.step);
        if (r.step > existing.lastStep) {
          existing.lastStep = r.step;
          existing.lastSentAt = r.sent_at;
        }
      }
    }
  }

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

        // Escalatie-stap uit vooraf gebatchte reminders-map
        const reminderState = reminderMap.get(inv.id);
        const lastStep = reminderState?.lastStep ?? 0;
        const lastSentAt = reminderState?.lastSentAt ?? null;

        // Only escalate if enough time has passed (7 days between steps)
        const daysSinceLastReminder = lastSentAt
          ? Math.floor((Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const nextStep = daysSinceLastReminder >= 7 ? Math.min(lastStep + 1, 3) : 0;

        if (nextStep > 0 && nextStep <= 3) {
          const emailResult = await sendReminderEmail(invoiceData, undefined, nextStep);
          emailSent = !emailResult.error;

          // Track reminder in history
          if (emailSent) {
            await supabase.from("invoice_reminders").insert({
              invoice_id: inv.id,
              step: nextStep,
              sent_at: new Date().toISOString(),
            }); // Non-fatal if fails
          }
        }

        // Na stap 3: ingebrekestelling (stap 4)
        if (lastStep >= 3 && daysSinceLastReminder >= 14) {
          const hasDefaultNotice = reminderState?.steps.has(4) ?? false;

          if (!hasDefaultNotice) {
            const defaultResult = await sendDefaultNotice(invoiceData);
            if (!defaultResult.error) {
              emailSent = true;
              await supabase.from("invoice_reminders").insert({
                invoice_id: inv.id,
                step: 4,
                sent_at: new Date().toISOString(),
              });

              // Action feed: incasso suggestie
              const interest = calculateLegalInterest(
                Number(inv.total_inc_vat) || 0,
                inv.due_date
              );
              await supabase.from("action_feed").insert({
                user_id: inv.user_id,
                type: "tax_alert",
                title: `Ingebrekestelling verstuurd: ${inv.invoice_number}`,
                description: `Formele ingebrekestelling verstuurd voor factuur ${inv.invoice_number}. Totaal verschuldigd incl. rente: ${formatCurrency(interest.totalOwed)}. Overweeg een incassobureau als betaling uitblijft.`,
                amount: interest.totalOwed,
                related_invoice_id: inv.id,
                ai_confidence: 1.0,
              });
            }
          }
        }
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
