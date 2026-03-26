"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  calculateZZPTaxProjection,
  type TaxProjection,
  type Investment,
} from "@/lib/tax/dutch-tax-2026";

export interface QuarterStats {
  quarter: string;
  revenueExVat: number;
  outputVat: number;
  inputVat: number;
  netVat: number;
  invoiceCount: number;
  receiptCount: number;
}

function getQuarterKey(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0-based
  const year = d.getFullYear();
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${year}`;
}

export async function getBtwOverview(): Promise<ActionResult<QuarterStats[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Limit to last 2 years (8 quarters max)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const startDate = `${twoYearsAgo.getFullYear()}-01-01`;

  // Run both queries in parallel
  const [invoicesResult, receiptsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("issue_date, subtotal_ex_vat, vat_amount, status")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", startDate),
    supabase
      .from("receipts")
      .select("receipt_date, vat_amount")
      .eq("user_id", user.id)
      .gte("receipt_date", startDate),
  ]);

  if (invoicesResult.error) return { error: invoicesResult.error.message };
  if (receiptsResult.error) return { error: receiptsResult.error.message };

  const invoices = invoicesResult.data;
  const receipts = receiptsResult.data;

  const quarters = new Map<string, QuarterStats>();

  const getOrCreate = (key: string): QuarterStats => {
    let q = quarters.get(key);
    if (!q) {
      q = {
        quarter: key,
        revenueExVat: 0,
        outputVat: 0,
        inputVat: 0,
        netVat: 0,
        invoiceCount: 0,
        receiptCount: 0,
      };
      quarters.set(key, q);
    }
    return q;
  };

  for (const inv of invoices ?? []) {
    if (!inv.issue_date) continue;
    const key = getQuarterKey(inv.issue_date);
    const q = getOrCreate(key);
    q.revenueExVat += Number(inv.subtotal_ex_vat) || 0;
    q.outputVat += Number(inv.vat_amount) || 0;
    q.invoiceCount += 1;
  }

  for (const rec of receipts ?? []) {
    if (!rec.receipt_date) continue;
    const key = getQuarterKey(rec.receipt_date);
    const q = getOrCreate(key);
    q.inputVat += Number(rec.vat_amount) || 0;
    q.receiptCount += 1;
  }

  // Calculate netVat and round
  for (const q of quarters.values()) {
    q.revenueExVat = Math.round(q.revenueExVat * 100) / 100;
    q.outputVat = Math.round(q.outputVat * 100) / 100;
    q.inputVat = Math.round(q.inputVat * 100) / 100;
    q.netVat = Math.round((q.outputVat - q.inputVat) * 100) / 100;
  }

  // Sort newest first (higher year first, then higher Q first), max 8
  const sorted = Array.from(quarters.values());
  sorted.sort((a, b) => {
    const ay = Number(a.quarter.split(" ")[1]);
    const by = Number(b.quarter.split(" ")[1]);
    if (ay !== by) return by - ay;
    const aq = Number(a.quarter.split(" ")[0].replace("Q", ""));
    const bq = Number(b.quarter.split(" ")[0].replace("Q", ""));
    return bq - aq;
  });

  return { error: null, data: sorted.slice(0, 8) };
}

// ─── Tax Projection: volledige IB-berekening met KIA + afschrijving ───

export async function getTaxProjection(): Promise<
  ActionResult<TaxProjection>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const now = new Date();
  const huidigJaar = now.getFullYear();
  const yearStart = `${huidigJaar}-01-01`;
  const yearEnd = `${huidigJaar}-12-31`;
  const maandenVerstreken = now.getMonth() + 1;

  const [invoicesRes, regularReceiptsRes, investmentReceiptsRes] =
    await Promise.all([
      // Facturen dit jaar (sent/paid) → omzet
      supabase
        .from("invoices")
        .select("subtotal_ex_vat")
        .eq("user_id", user.id)
        .in("status", ["sent", "paid"])
        .gte("issue_date", yearStart)
        .lte("issue_date", yearEnd),

      // Reguliere kosten dit jaar (niet cost_code 4230)
      supabase
        .from("receipts")
        .select("amount_ex_vat, cost_code")
        .eq("user_id", user.id)
        .gte("receipt_date", yearStart)
        .lte("receipt_date", yearEnd)
        .or("cost_code.is.null,cost_code.neq.4230"),

      // Investeringen (cost_code 4230) — ALLE jaren voor afschrijving
      supabase
        .from("receipts")
        .select("id, vendor_name, amount_ex_vat, receipt_date")
        .eq("user_id", user.id)
        .eq("cost_code", 4230)
        .not("amount_ex_vat", "is", null)
        .not("receipt_date", "is", null),
    ]);

  if (invoicesRes.error) return { error: invoicesRes.error.message };
  if (regularReceiptsRes.error)
    return { error: regularReceiptsRes.error.message };
  if (investmentReceiptsRes.error)
    return { error: investmentReceiptsRes.error.message };

  // Omzet ex BTW
  const jaarOmzetExBtw = (invoicesRes.data ?? []).reduce(
    (sum, inv) => sum + (Number(inv.subtotal_ex_vat) || 0),
    0,
  );

  // Reguliere kosten ex BTW (incl. kleine investeringen < €450 die direct aftrekbaar zijn)
  const jaarKostenExBtw = (regularReceiptsRes.data ?? []).reduce(
    (sum, rec) => sum + (Number(rec.amount_ex_vat) || 0),
    0,
  );

  // Investeringen omzetten naar Investment objecten
  const investeringen: Investment[] = (investmentReceiptsRes.data ?? []).map(
    (rec) => ({
      id: rec.id,
      omschrijving: rec.vendor_name ?? "Investering",
      aanschafprijs: Number(rec.amount_ex_vat) || 0,
      aanschafDatum: rec.receipt_date!,
      levensduur: 5, // default 5 jaar
      restwaarde: 0, // default €0
    }),
  );

  const projection = calculateZZPTaxProjection({
    jaarOmzetExBtw,
    jaarKostenExBtw,
    investeringen,
    maandenVerstreken,
  });

  return { error: null, data: projection };
}
