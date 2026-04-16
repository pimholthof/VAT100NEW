/**
 * KOR (Kleineondernemersregeling) drempelmonitor.
 *
 * Wettelijke regel (2026): omzet ≤ €20.000 per kalenderjaar.
 * Bij overschrijding ben je vanaf de transactie die de drempel
 * passeert direct BTW-plichtig en moet je je deregistreren bij
 * de Belastingdienst (formulier "Opzegging KOR").
 *
 * Deze module berekent de stand en geeft een banded waarschuwing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const KOR_THRESHOLD_EUR = 20_000;
export const KOR_WARN_AT_EUR = 16_000; // 80% van de drempel

export type KorStatus =
  | "ok" // < 80%
  | "approaching" // 80–99%
  | "exceeded"; // ≥ 100%

export interface KorMonitorResult {
  enabled: boolean;
  ytdRevenueExVat: number;
  threshold: number;
  remaining: number;
  percent: number;
  status: KorStatus;
  message: string | null;
  year: number;
}

/**
 * Bereken de KOR-stand voor een gebruiker over het lopende kalenderjaar.
 * Telt alleen niet-gearchiveerde, verzonden of betaalde facturen mee.
 */
export async function getKorStatus(
  supabase: SupabaseClient,
  userId: string,
  options?: { korEnabled?: boolean; now?: Date }
): Promise<KorMonitorResult> {
  const now = options?.now ?? new Date();
  const year = now.getFullYear();
  const startOfYear = `${year}-01-01`;
  const startOfNextYear = `${year + 1}-01-01`;

  const { data, error } = await supabase
    .from("invoices")
    .select("subtotal_ex_vat")
    .eq("user_id", userId)
    .is("archived_at", null)
    .in("status", ["sent", "paid", "overdue"])
    .gte("issue_date", startOfYear)
    .lt("issue_date", startOfNextYear);

  const revenue =
    error || !data
      ? 0
      : data.reduce((sum, row) => sum + (Number(row.subtotal_ex_vat) || 0), 0);

  const enabled = options?.korEnabled ?? true;
  const remaining = Math.max(0, KOR_THRESHOLD_EUR - revenue);
  const percent = Math.min(
    999,
    Math.round((revenue / KOR_THRESHOLD_EUR) * 100)
  );

  let status: KorStatus = "ok";
  let message: string | null = null;

  if (revenue >= KOR_THRESHOLD_EUR) {
    status = "exceeded";
    message = `Je hebt de KOR-drempel van €${KOR_THRESHOLD_EUR.toLocaleString("nl-NL")} overschreden (${percent}%). Vanaf de transactie die de drempel passeerde ben je BTW-plichtig en moet je je per direct afmelden voor de KOR bij de Belastingdienst.`;
  } else if (revenue >= KOR_WARN_AT_EUR) {
    status = "approaching";
    message = `Je nadert de KOR-drempel: €${revenue.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} van €${KOR_THRESHOLD_EUR.toLocaleString("nl-NL")} (${percent}%). Nog €${remaining.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} ruimte voor ${year} eindigt.`;
  }

  return {
    enabled,
    ytdRevenueExVat: revenue,
    threshold: KOR_THRESHOLD_EUR,
    remaining,
    percent,
    status,
    message,
    year,
  };
}
