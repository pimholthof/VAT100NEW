"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { calculateBtwRubrieken } from "@/lib/tax/btw-rubrieken";

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
      .lte("receipt_date", qEnd)
      .is("archived_at", null),

    supabase
      .from("profiles")
      .select("btw_number, full_name, studio_name")
      .eq("id", user.id)
      .single(),
  ]);

  if (invoiceLinesRes.error) return { error: invoiceLinesRes.error.message };
  if (receiptsRes.error) return { error: receiptsRes.error.message };

  const r = calculateBtwRubrieken(
    invoiceLinesRes.data ?? [],
    receiptsRes.data ?? [],
  );

  return {
    error: null,
    data: {
      jaar: year,
      kwartaal: quarter,
      periode: `Q${quarter} ${year}`,
      rubriek1a: r["1a"],
      rubriek1b: r["1b"],
      rubriek1c: r["1c"],
      rubriek2a: r["2a"],
      rubriek3b: r["3b"],
      rubriek4a: r["4a"],
      rubriek4b: r["4b"],
      rubriek5b: r.voorbelasting,
      totaalBtw: r.totaalBtw,
      voorbelasting: r.voorbelasting,
      rubriek5g: r.rubriek5g,
      btwNummer: profileRes.data?.btw_number ?? null,
      naam: profileRes.data?.studio_name ?? profileRes.data?.full_name ?? null,
    },
  };
}
