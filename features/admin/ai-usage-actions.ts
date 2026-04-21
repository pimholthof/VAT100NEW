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
    ocrCount: number;
    chatCount: number;
    estimatedCostEuros: number;
  }>;
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
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  const topUsers = enriched.map((u) => {
    const p = profileMap.get(u.userId);
    return {
      ...u,
      fullName: p?.full_name ?? null,
    };
  });

  return {
    error: null,
    data: {
      periodStart: period,
      totalOcr,
      totalChat,
      uniqueUsers: list.length,
      estimatedCostEuros: totalCostEuros,
      topUsers,
    },
  };
}

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
