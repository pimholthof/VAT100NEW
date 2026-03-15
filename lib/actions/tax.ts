"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

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
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

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

  // Sort newest first, max 8
  const sorted = Array.from(quarters.values()).sort((a, b) => {
    const [aq, ay] = a.quarter.split(" ");
    const [bq, by] = b.quarter.split(" ");
    if (ay !== by) return Number(by) - Number(ay);
    return Number(bq.replace("Q", "")) - Number(aq.replace("Q", "")) > 0 ? 1 : -1;
  });

  // Fix sort: newest first means higher year first, then higher Q first
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
