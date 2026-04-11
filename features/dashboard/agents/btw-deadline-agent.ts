import type { ActionResult } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Agent 7: BTW Deadline Alert.
 * Maakt een actie-item aan wanneer de BTW-deadline binnen 14 dagen is
 * en er een draft BTW-aangifte klaarligt.
 */
export async function runBtwDeadlineAlert(
  userId: string,
  externalSupabase?: Awaited<ReturnType<typeof createClient>>
): Promise<ActionResult<{ created: boolean }>> {
  try {
    const supabase = externalSupabase || await createClient();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Bepaal volgende BTW-deadline
    const filingPeriods = [
      { quarter: 4, year: currentYear - 1, deadline: new Date(currentYear, 0, 31) },
      { quarter: 1, year: currentYear, deadline: new Date(currentYear, 3, 30) },
      { quarter: 2, year: currentYear, deadline: new Date(currentYear, 6, 31) },
      { quarter: 3, year: currentYear, deadline: new Date(currentYear, 9, 31) },
      { quarter: 4, year: currentYear, deadline: new Date(currentYear + 1, 0, 31) },
    ];

    const nextDeadline = filingPeriods.find((p) => p.deadline >= now);
    if (!nextDeadline) return { error: null, data: { created: false } };

    const daysUntil = Math.ceil(
      (nextDeadline.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Alleen alert als deadline binnen 14 dagen
    if (daysUntil > 14) return { error: null, data: { created: false } };

    // Check of er al een alert bestaat
    const { data: existing } = await supabase
      .from("action_feed")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "tax_alert")
      .eq("status", "pending")
      .like("title", `%BTW-aangifte Q${nextDeadline.quarter}%`)
      .limit(1);

    if (existing && existing.length > 0) return { error: null, data: { created: false } };

    // Check of er een draft aangifte klaarligt
    const { data: draft } = await supabase
      .from("vat_returns")
      .select("id, status")
      .eq("user_id", userId)
      .eq("year", nextDeadline.year)
      .eq("quarter", nextDeadline.quarter)
      .single();

    const hasDraft = draft?.status === "draft";
    const isLocked = draft?.status === "locked";

    let title: string;
    let description: string;

    if (isLocked) {
      title = `BTW-aangifte Q${nextDeadline.quarter} klaar voor indiening`;
      description = `Je BTW-aangifte is vergrendeld en klaar. Dien deze in bij de Belastingdienst vóór ${nextDeadline.deadline.toLocaleDateString("nl-NL")} (${daysUntil} dagen).`;
    } else if (hasDraft) {
      title = `BTW-aangifte Q${nextDeadline.quarter} reviewen`;
      description = `Je concept BTW-aangifte staat klaar. Review en vergrendel deze vóór ${nextDeadline.deadline.toLocaleDateString("nl-NL")} (${daysUntil} dagen).`;
    } else {
      title = `BTW-aangifte Q${nextDeadline.quarter} voorbereiden`;
      description = `De BTW-deadline is over ${daysUntil} dagen (${nextDeadline.deadline.toLocaleDateString("nl-NL")}). Ga naar Belasting om je aangifte voor te bereiden.`;
    }

    await supabase.from("action_feed").insert({
      user_id: userId,
      type: "tax_alert",
      title,
      description,
      ai_confidence: 1.0,
      status: "pending",
    });

    // Audit trail
    import("@/lib/audit/agent-audit").then((m) =>
      m.logAgentDecision({
        agentName: "BtwDeadlineAlert",
        actionType: "tax_alert",
        userId,
        confidence: 1.0,
        inputSummary: { quarter: nextDeadline.quarter, year: nextDeadline.year, daysUntil },
        outputSummary: { hasDraft, isLocked },
        wasAutoExecuted: false,
      }).catch(() => {})
    );

    return { error: null, data: { created: true } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "btw_deadline_alert", userId } });
    return { error: getErrorMessage(err) };
  }
}
