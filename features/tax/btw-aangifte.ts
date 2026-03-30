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

  // Rubriek 2: Intracommunautaire prestaties (ICP)
  rubriek2a: { omzet: number; btw: number }; // Leveringen naar EU-landen

  // Rubriek 3: Verleggingsregelingen
  rubriek3b: { omzet: number; btw: number }; // Diensten EU reverse charge

  // Rubriek 4: Buitenlandse prestaties
  rubriek4a: { omzet: number; btw: number }; // Leveringen buiten EU
  rubriek4b: { omzet: number; btw: number }; // Diensten buiten EU

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
    supabase
      .from("invoices")
      .select("id, subtotal_ex_vat, vat_amount, vat_rate, issue_date, is_credit_note, vat_scheme, invoice_lines(amount, vat_rate)")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", qStart)
      .lte("issue_date", qEnd),

    supabase
      .from("receipts")
      .select("vat_amount, amount_ex_vat, business_percentage")
      .eq("user_id", user.id)
      .gte("receipt_date", qStart)
      .lte("receipt_date", qEnd),

    supabase
      .from("profiles")
      .select("btw_number, full_name, studio_name")
      .eq("id", user.id)
      .single(),
  ]);

  if (invoiceLinesRes.error) return { error: invoiceLinesRes.error.message };
  if (receiptsRes.error) return { error: receiptsRes.error.message };

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Calculate per rubriek
  const rubrieken = {
    "1a": { omzet: 0, btw: 0 },
    "1b": { omzet: 0, btw: 0 },
    "1c": { omzet: 0, btw: 0 },
    "2a": { omzet: 0, btw: 0 },
    "3b": { omzet: 0, btw: 0 },
    "4a": { omzet: 0, btw: 0 },
    "4b": { omzet: 0, btw: 0 },
  };

  for (const inv of invoiceLinesRes.data ?? []) {
    const sign = inv.is_credit_note ? -1 : 1;
    const scheme = (inv as { vat_scheme?: string }).vat_scheme ?? "standard";
    const lines = (inv as { invoice_lines?: { amount: number; vat_rate: number | null }[] }).invoice_lines;

    // Route to correct rubriek based on vat_scheme
    if (scheme === "eu_reverse_charge") {
      // Rubriek 3b: verlegging diensten binnen EU
      const amount = Number(inv.subtotal_ex_vat) || 0;
      rubrieken["3b"].omzet += sign * amount;
      continue;
    }

    if (scheme === "export_outside_eu") {
      // Rubriek 4a: leveringen/diensten buiten EU
      const amount = Number(inv.subtotal_ex_vat) || 0;
      rubrieken["4a"].omzet += sign * amount;
      continue;
    }

    // Standard: categorize by VAT rate
    if (lines && lines.length > 0) {
      for (const line of lines) {
        const rate = line.vat_rate ?? inv.vat_rate ?? 21;
        const key = rate === 21 ? "1a" : rate === 9 ? "1b" : "1c";
        const amount = Number(line.amount) || 0;
        rubrieken[key].omzet += sign * amount;
        rubrieken[key].btw += sign * round2(amount * (rate / 100));
      }
    } else {
      const rate = inv.vat_rate ?? 21;
      const key = rate === 21 ? "1a" : rate === 9 ? "1b" : "1c";
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

  const totaalBtw = round2(
    rubrieken["1a"].btw + rubrieken["1b"].btw + rubrieken["1c"].btw
  );

  return {
    error: null,
    data: {
      jaar: year,
      kwartaal: quarter,
      periode: `Q${quarter} ${year}`,
      rubriek1a: { omzet: round2(rubrieken["1a"].omzet), btw: round2(rubrieken["1a"].btw) },
      rubriek1b: { omzet: round2(rubrieken["1b"].omzet), btw: round2(rubrieken["1b"].btw) },
      rubriek1c: { omzet: round2(rubrieken["1c"].omzet), btw: round2(rubrieken["1c"].btw) },
      rubriek2a: { omzet: round2(rubrieken["2a"].omzet), btw: round2(rubrieken["2a"].btw) },
      rubriek3b: { omzet: round2(rubrieken["3b"].omzet), btw: round2(rubrieken["3b"].btw) },
      rubriek4a: { omzet: round2(rubrieken["4a"].omzet), btw: round2(rubrieken["4a"].btw) },
      rubriek4b: { omzet: round2(rubrieken["4b"].omzet), btw: round2(rubrieken["4b"].btw) },
      rubriek5b: round2(voorbelasting),
      totaalBtw,
      voorbelasting: round2(voorbelasting),
      rubriek5g: round2(totaalBtw - voorbelasting),
      btwNummer: profileRes.data?.btw_number ?? null,
      naam: profileRes.data?.studio_name ?? profileRes.data?.full_name ?? null,
    },
  };
}
