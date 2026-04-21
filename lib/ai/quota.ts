"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

export type AiQuotaKind = "ocr" | "chat";

const QUOTA_COLUMN: Record<AiQuotaKind, "ai_ocr_quota" | "ai_chat_quota"> = {
  ocr: "ai_ocr_quota",
  chat: "ai_chat_quota",
};

const USAGE_COLUMN: Record<AiQuotaKind, "ocr_count" | "chat_count"> = {
  ocr: "ocr_count",
  chat: "chat_count",
};

/**
 * Reserveer één AI-credit voor deze gebruiker in de huidige maand.
 *
 * Marge-bescherming: Complete heeft 300 OCR + 200 chat per maand, Studio 50
 * OCR. Plus is onbeperkt (null = geen limiet). Start heeft geen AI en wordt
 * hier niet binnengelaten via requirePlan.
 */
export async function consumeAiQuota(
  userId: string,
  kind: AiQuotaKind,
): Promise<ActionResult<{ remaining: number | null }>> {
  const supabase = createServiceClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .single();

  if (!subscription) return { error: "Geen actief abonnement." };

  const { data: plan } = await supabase
    .from("plans")
    .select(`id, ${QUOTA_COLUMN[kind]}`)
    .eq("id", subscription.plan_id)
    .single();

  if (!plan) return { error: "Plan niet gevonden." };

  const quota = (plan as Record<string, number | null>)[QUOTA_COLUMN[kind]];

  // null = onbeperkt (Plus tier)
  if (quota === null) return { error: null, data: { remaining: null } };
  if (quota === 0) {
    return { error: "Deze functie zit niet in je huidige abonnement." };
  }

  const periodStart = currentPeriodStart();
  const usageCol = USAGE_COLUMN[kind];

  // Atomic upsert + increment via RPC
  const { data: used, error } = await supabase.rpc("consume_ai_quota", {
    p_user_id: userId,
    p_period_start: periodStart,
    p_kind: usageCol,
    p_limit: quota,
  });

  if (error) return { error: "Kon AI-gebruik niet registreren." };

  const remaining = Math.max(0, quota - (used ?? 0));
  if ((used ?? 0) > quota) {
    return {
      error: `AI-limiet bereikt (${quota}/maand). Upgrade naar Plus voor onbeperkt gebruik.`,
    };
  }

  return { error: null, data: { remaining } };
}

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
