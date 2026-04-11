import type { ActionResult, ActionFeedItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  total_inc_vat: number;
  due_date: string;
  client: { name: string } | null;
}

/**
 * Agent 3: The Anticipation Engine.
 */
export async function runAnticipationAgent(userId: string, externalSupabase?: Awaited<ReturnType<typeof createClient>>): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: overdue, error: invError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_inc_vat, due_date, client:clients(name)")
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10) as { data: OverdueInvoice[] | null; error: { message: string } | null };

    if (invError) return { error: invError.message };
    if (!overdue || overdue.length === 0) return { error: null, data: { created: 0 } };

    const invoiceIds = overdue.map((inv) => inv.id);
    const { data: existingActions } = await supabase
      .from("action_feed")
      .select("related_invoice_id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .eq("type", "reminder_suggestion")
      .in("related_invoice_id", invoiceIds);

    const existingInvoiceIds = new Set((existingActions ?? []).map((a) => a.related_invoice_id));
    const newActions: Partial<ActionFeedItem>[] = [];

    for (const inv of overdue) {
      if (existingInvoiceIds.has(inv.id)) continue;

      const clientName = inv.client?.name ?? "Onbekende klant";
      const amount = formatCurrency(inv.total_inc_vat);
      const dueTime = new Date(inv.due_date).getTime();
      const nowTime = new Date(today).getTime();
      const daysOverdue = Math.floor((nowTime - dueTime) / (1000 * 3600 * 24));

      if (daysOverdue < 2) continue;

      const draft = `Beste ${clientName},\n\nUit mijn administratie blijkt dat factuur ${inv.invoice_number} (${amount}) nog niet is voldaan. Zou je dit kunnen controleren?\n\nMet vriendelijke groet,\nDe boekhoudbot`;

      newActions.push({
        user_id: userId,
        type: "reminder_suggestion",
        title: `Betaling herinneren: ${clientName}`,
        description: `Factuur ${inv.invoice_number} (${amount}) is verlopen sinds ${new Date(inv.due_date).toLocaleDateString("nl-NL")}.`,
        amount: inv.total_inc_vat,
        draft_content: draft,
        related_invoice_id: inv.id,
        ai_confidence: 0.98,
        status: "pending"
      });
    }

    if (newActions.length > 0) {
      const { error: insertError } = await supabase.from("action_feed").insert(newActions);
      if (insertError) return { error: insertError.message };

      // Audit trail
      for (const action of newActions) {
        import("@/lib/audit/agent-audit").then((m) =>
          m.logAgentDecision({
            agentName: "AnticipationAgent",
            actionType: "tax_alert",
            userId,
            confidence: action.ai_confidence ?? 0.98,
            inputSummary: { invoiceId: action.related_invoice_id, amount: action.amount },
            outputSummary: { type: action.type },
            wasAutoExecuted: false,
          }).catch(() => {})
        );
      }
    }

    return { error: null, data: { created: newActions.length } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "anticipation", userId } });
    return { error: getErrorMessage(err) };
  }
}
