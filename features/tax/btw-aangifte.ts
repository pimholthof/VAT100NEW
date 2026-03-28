"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// ─── OB-formulier rubrieken (Omzetbelasting aangifte) ───

export interface BtwAangifteData {
  jaar: number;
  kwartaal: number;
  periode: string; // "Q1 2026"

  // Rubriek 1: Prestaties binnenland
  rubriek1a: { omzet: number; btw: number }; // 21% (hoog tarief)
  rubriek1b: { omzet: number; btw: number }; // 9% (laag tarief)
  rubriek1c: { omzet: number; btw: number }; // 0% / overige tarieven

  // Rubriek 5: Voorbelasting
  rubriek5b: number; // Voorbelasting (input BTW)

  // Rubriek 5g: Totaal
  totaalBtw: number; // Totaal verschuldigde BTW (1a+1b+1c btw)
  voorbelasting: number; // Totaal voorbelasting (5b)
  rubriek5g: number; // Te betalen (+) of terug te ontvangen (-)

  // Profiel
  btwNummer: string | null;
  naam: string | null;
}

export async function generateBtwAangifte(
  year: number,
  quarter: number,
): Promise<ActionResult<BtwAangifteData>> {
  if (quarter < 1 || quarter > 4) return { error: "Ongeldig kwartaal." };
  if (!Number.isInteger(year) || year < 2020 || year > new Date().getFullYear()) {
    return { error: "Ongeldig jaar." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const qStart = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const qEnd = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  const [invoiceLinesRes, receiptsRes, profileRes] = await Promise.all([
    // Invoice lines met per-line vat_rate
    supabase
      .from("invoices")
      .select("id, subtotal_ex_vat, vat_amount, vat_rate, issue_date, is_credit_note, invoice_lines(amount, vat_rate)")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", qStart)
      .lte("issue_date", qEnd),

    // Receipts (voorbelasting)
    supabase
      .from("receipts")
      .select("vat_amount, amount_ex_vat, business_percentage")
      .eq("user_id", user.id)
      .gte("receipt_date", qStart)
      .lte("receipt_date", qEnd),

    // Profiel
    supabase
      .from("profiles")
      .select("btw_number, full_name, studio_name")
      .eq("id", user.id)
      .single(),
  ]);

  if (invoiceLinesRes.error) return { error: invoiceLinesRes.error.message };
  if (receiptsRes.error) return { error: receiptsRes.error.message };

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Bereken omzet per BTW-tarief
  const rubrieken = { 21: { omzet: 0, btw: 0 }, 9: { omzet: 0, btw: 0 }, 0: { omzet: 0, btw: 0 } };

  for (const inv of invoiceLinesRes.data ?? []) {
    const sign = inv.is_credit_note ? -1 : 1;
    const lines = (inv as { invoice_lines?: { amount: number; vat_rate: number | null }[] }).invoice_lines;

    if (lines && lines.length > 0) {
      // Per-line BTW rates
      for (const line of lines) {
        const rate = line.vat_rate ?? inv.vat_rate ?? 21;
        const key = rate === 21 ? 21 : rate === 9 ? 9 : 0;
        const amount = Number(line.amount) || 0;
        rubrieken[key].omzet += sign * amount;
        rubrieken[key].btw += sign * round2(amount * (rate / 100));
      }
    } else {
      // Fallback: invoice-level rate
      const rate = inv.vat_rate ?? 21;
      const key = rate === 21 ? 21 : rate === 9 ? 9 : 0;
      rubrieken[key].omzet += sign * (Number(inv.subtotal_ex_vat) || 0);
      rubrieken[key].btw += sign * (Number(inv.vat_amount) || 0);
    }
  }

  // Voorbelasting
  let voorbelasting = 0;
  for (const rec of receiptsRes.data ?? []) {
    const pct = (rec.business_percentage ?? 100) / 100;
    voorbelasting += (Number(rec.vat_amount) || 0) * pct;
  }

  const totaalBtw = round2(rubrieken[21].btw + rubrieken[9].btw + rubrieken[0].btw);

  return {
    error: null,
    data: {
      jaar: year,
      kwartaal: quarter,
      periode: `Q${quarter} ${year}`,
      rubriek1a: { omzet: round2(rubrieken[21].omzet), btw: round2(rubrieken[21].btw) },
      rubriek1b: { omzet: round2(rubrieken[9].omzet), btw: round2(rubrieken[9].btw) },
      rubriek1c: { omzet: round2(rubrieken[0].omzet), btw: round2(rubrieken[0].btw) },
      rubriek5b: round2(voorbelasting),
      totaalBtw,
      voorbelasting: round2(voorbelasting),
      rubriek5g: round2(totaalBtw - voorbelasting),
      btwNummer: profileRes.data?.btw_number ?? null,
      naam: profileRes.data?.studio_name ?? profileRes.data?.full_name ?? null,
    },
  };
}
