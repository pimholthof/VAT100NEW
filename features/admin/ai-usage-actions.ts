"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { estimateCostCents } from "@/lib/ai/models";

export interface AiUsageSummary {
  periodStart: string;
  totalOcr: number;
  totalChat: number;
  uniqueUsers: number;
  estimatedCostEuros: number;
  topUsers: Array<{
    userId: string;
    fullName: string | null;
    email: string | null;
    planId: string | null;
    ocrCount: number;
    chatCount: number;
    estimatedCostEuros: number;
  }>;
  totalMrrCents: number;
}

/**
 * Admin-overzicht van AI-verbruik per maand.
 *
 * Business-doel: vroeg signaleren welke gebruikers de marge onder druk zetten
 * (power-users boven quota) en de totale Claude-kosten per maand monitoren
 * tegenover MRR.
 */
export async function getAiUsageSummary(
  periodStart?: string,
): Promise<ActionResult<AiUsageSummary>> {
  const admin = await requireAdmin();
  if (admin.error !== null) return { error: admin.error };

  const supabase = createServiceClient();
  const period = periodStart ?? currentPeriodStart();

  const { data: rows, error } = await supabase
    .from("ai_usage")
    .select("user_id, ocr_count, chat_count")
    .eq("period_start", period);

  if (error) return { error: "Kon AI-gebruik niet ophalen." };

  const list = rows ?? [];
  const totalOcr = list.reduce((s, r) => s + (r.ocr_count ?? 0), 0);
  const totalChat = list.reduce((s, r) => s + (r.chat_count ?? 0), 0);

  // Grove kostenschatting: OCR ≈ 3000 input + 800 output tokens per call,
  // chat ≈ 2000 input + 500 output. Gebaseerd op huidige prompts.
  const ocrCostCents = estimateCostCents("OCR", 3000 * totalOcr, 800 * totalOcr);
  const chatCostCents = estimateCostCents("CHAT", 2000 * totalChat, 500 * totalChat);
  const totalCostEuros = (ocrCostCents + chatCostCents) / 100;

  // Top-10 gebruikers op geschatte kosten
  const enriched = list
    .map((r) => {
      const ocrUsd = estimateCostCents("OCR", 3000 * r.ocr_count, 800 * r.ocr_count);
      const chatUsd = estimateCostCents("CHAT", 2000 * r.chat_count, 500 * r.chat_count);
      return {
        userId: r.user_id,
        ocrCount: r.ocr_count,
        chatCount: r.chat_count,
        estimatedCostEuros: (ocrUsd + chatUsd) / 100,
      };
    })
    .sort((a, b) => b.estimatedCostEuros - a.estimatedCostEuros)
    .slice(0, 10);

  const userIds = enriched.map((u) => u.userId);

  // Parallel: profielnamen, plan-id's en auth-emails ophalen
  const [profileQuery, subQuery, mrrQuery] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    userIds.length
      ? supabase
          .from("subscriptions")
          .select("user_id, plan_id, price_lock_cents, plan:plans(price_cents, interval_months)")
          .in("user_id", userIds)
          .in("status", ["active", "past_due"])
      : Promise.resolve({ data: [] as Array<{
          user_id: string;
          plan_id: string;
          price_lock_cents: number | null;
          plan: { price_cents: number; interval_months: number } | null;
        }> }),
    // Totale MRR over alle actieve klanten: één query, sommeren met grandfathering
    supabase
      .from("subscriptions")
      .select("price_lock_cents, plan:plans(price_cents, interval_months)")
      .in("status", ["active", "past_due"]),
  ]);

  const profileMap = new Map(
    (profileQuery.data ?? []).map((p) => [p.id, p]),
  );

  // Email uit auth.users via admin API (alleen voor top-users, niet schaalbaar naar volledige base).
  const emailMap = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(id);
        emailMap.set(id, data.user?.email ?? null);
      } catch {
        emailMap.set(id, null);
      }
    }),
  );

  const planMap = new Map(
    (subQuery.data ?? []).map((s) => [s.user_id, s]),
  );

  const topUsers = enriched.map((u) => {
    const p = profileMap.get(u.userId);
    const sub = planMap.get(u.userId);
    return {
      ...u,
      fullName: p?.full_name ?? null,
      email: emailMap.get(u.userId) ?? null,
      planId: sub?.plan_id ?? null,
    };
  });

  // Totale MRR = sum(price_lock_cents ?? plan.price_cents) / interval_months.
  // Supabase kan nested joins als array of object typen; normaliseer naar object.
  const totalMrrCents = (mrrQuery.data ?? []).reduce((sum, row) => {
    const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
    const months = (plan?.interval_months as number) ?? 1;
    const priceCents =
      row.price_lock_cents ?? ((plan?.price_cents as number) ?? 0);
    return sum + Math.round(priceCents / months);
  }, 0);

  return {
    error: null,
    data: {
      periodStart: period,
      totalOcr,
      totalChat,
      uniqueUsers: list.length,
      estimatedCostEuros: totalCostEuros,
      topUsers,
      totalMrrCents,
    },
  };
}

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
