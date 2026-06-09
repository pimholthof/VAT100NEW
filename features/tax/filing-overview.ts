"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  assessBtwFiling,
  assessIbFiling,
  assessJaarrekeningFiling,
  type FilingReadiness,
} from "@/lib/tax/filing-readiness";
import { previewVatReturn, getVatReturns } from "./vat-returns-actions";
import { getTaxPayments } from "./payments-actions";
import { getJaarrekeningData } from "./jaarrekening";

export interface BtwFilingContext {
  readiness: FilingReadiness;
  year: number;
  quarter: number;
  returnId: string | null;
}

export interface YearFilingContext {
  readiness: FilingReadiness;
  year: number;
}

export interface FilingOverview {
  btw: BtwFilingContext | null;
  ib: YearFilingContext | null;
  jaarrekening: YearFilingContext | null;
}

/** Het meest recente afgesloten (en dus indienbare) kwartaal. */
function mostRecentEndedQuarter(now: Date): { year: number; quarter: number } {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month <= 3) return { year: year - 1, quarter: 4 };
  if (month <= 6) return { year, quarter: 1 };
  if (month <= 9) return { year, quarter: 2 };
  return { year, quarter: 3 };
}

/** BTW-aangiftedeadline = laatste dag van de maand ná het kwartaal. */
function quarterFilingDeadline(year: number, quarter: number): Date {
  return new Date(year, quarter * 3 + 1, 0);
}

/**
 * Verzamelt de feiten en velt — via de pure readiness-hersenen — het oordeel
 * over de drie aangiftes: BTW (meest recente kwartaal), IB en jaarrekening
 * (laatste afgesloten jaar). Eén bron voor de Jaarafsluiting-surface.
 */
export async function getFilingOverview(): Promise<ActionResult<FilingOverview>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("uses_kor, full_name, btw_number, kvk_number")
    .eq("id", user.id)
    .single();

  const usesKor = profile?.uses_kor ?? false;
  const profileComplete =
    !!profile?.full_name && (!!profile?.btw_number || !!profile?.kvk_number);

  const now = new Date();

  // ── BTW: meest recente afgesloten kwartaal ──
  const { year: bYear, quarter: bQuarter } = mostRecentEndedQuarter(now);
  const deadline = quarterFilingDeadline(bYear, bQuarter);
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);

  const [previewRes, returnsRes, btwPaymentsRes] = await Promise.all([
    previewVatReturn(bYear, bQuarter),
    getVatReturns(),
    getTaxPayments(bYear),
  ]);

  const vr = (returnsRes.data ?? []).find(
    (r) => r.year === bYear && r.quarter === bQuarter,
  );
  const returnStatus = (vr?.status ?? "none") as "none" | "draft" | "locked" | "submitted";
  const netVat = previewRes.data?.teBetalen ?? 0;
  const incompleteReceiptCount = (previewRes.data?.receipts ?? []).filter(
    (r) => r.amount_ex_vat == null,
  ).length;
  const btwPaid = (btwPaymentsRes.data ?? []).some(
    (p) => p.type === "btw" && p.period === `${bYear}-Q${bQuarter}`,
  );

  const btw: BtwFilingContext = {
    year: bYear,
    quarter: bQuarter,
    returnId: vr?.id ?? null,
    readiness: assessBtwFiling({
      period: `Q${bQuarter} ${bYear}`,
      periodEnded: true,
      deadline: deadline.toISOString(),
      daysRemaining,
      returnStatus,
      paid: btwPaid,
      incompleteReceiptCount,
      netVat,
      usesKor,
    }),
  };

  // ── IB + jaarrekening: laatste afgesloten jaar ──
  const prevYear = now.getFullYear() - 1;
  let ib: YearFilingContext | null = null;
  let jaarrekening: YearFilingContext | null = null;

  const jrRes = await getJaarrekeningData(prevYear);
  const jr = jrRes.data;
  if (jr) {
    const hasActivity = jr.factuurAantal > 0 || jr.bonnenAantal > 0;
    if (hasActivity) {
      const ibPaid =
        (await getTaxPayments(prevYear)).data?.some((p) => p.type === "ib") ?? false;

      ib = {
        year: prevYear,
        readiness: assessIbFiling({
          year: prevYear,
          yearEnded: true,
          hasActivity,
          profileComplete,
          incompleteReceiptCount: 0,
          nettoIB: jr.fiscaal.nettoIB,
          paid: ibPaid,
        }),
      };

      const balanceBalances =
        Math.abs(jr.balans.totaalActiva - jr.balans.totaalPassiva) < 1;
      jaarrekening = {
        year: prevYear,
        readiness: assessJaarrekeningFiling({
          year: prevYear,
          yearEnded: true,
          hasActivity,
          balanceBalances,
          incompleteReceiptCount: 0,
        }),
      };
    }
  }

  return { error: null, data: { btw, ib, jaarrekening } };
}
