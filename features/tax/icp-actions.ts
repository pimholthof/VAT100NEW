"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface ICPEntry {
  clientName: string;
  clientBtwNumber: string | null;
  totalAmount: number;
  invoiceCount: number;
}

export interface ICPReport {
  year: number;
  quarter: number;
  entries: ICPEntry[];
  totalAmount: number;
}

/**
 * Generate ICP report: list all EU reverse-charge invoices grouped by client.
 */
export async function getICPReport(
  year: number,
  quarter: number
): Promise<ActionResult<ICPReport>> {
  if (quarter < 1 || quarter > 4) return { error: "Ongeldig kwartaal." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const qStart = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const qEnd = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, subtotal_ex_vat, is_credit_note, client_id, clients(name, btw_number)")
    .eq("user_id", user.id)
    .eq("vat_scheme", "eu_reverse_charge")
    .in("status", ["sent", "paid"])
    .gte("issue_date", qStart)
    .lte("issue_date", qEnd);

  if (error) return { error: error.message };

  // Group by client
  const byClient = new Map<
    string,
    { name: string; btwNumber: string | null; total: number; count: number }
  >();

  for (const inv of invoices ?? []) {
    const sign = inv.is_credit_note ? -1 : 1;
    const amount = sign * (Number(inv.subtotal_ex_vat) || 0);
    const client = inv.clients as unknown as { name: string; btw_number: string | null } | null;
    const clientId = inv.client_id;

    const existing = byClient.get(clientId);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      byClient.set(clientId, {
        name: client?.name ?? "Onbekend",
        btwNumber: client?.btw_number ?? null,
        total: amount,
        count: 1,
      });
    }
  }

  const entries: ICPEntry[] = Array.from(byClient.values())
    .map((e) => ({
      clientName: e.name,
      clientBtwNumber: e.btwNumber,
      totalAmount: Math.round(e.total * 100) / 100,
      invoiceCount: e.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalAmount = entries.reduce((sum, e) => sum + e.totalAmount, 0);

  return {
    error: null,
    data: { year, quarter, entries, totalAmount: Math.round(totalAmount * 100) / 100 },
  };
}
