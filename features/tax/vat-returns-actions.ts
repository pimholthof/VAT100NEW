"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, VatReturn, VatReturnStatus } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";
import { sanitizeSupabaseError } from "@/lib/errors";

/**
 * Generate a VAT return for a given year/quarter based on unlinked invoices/receipts.
 */
export async function generateVatReturn(
  year: number,
  quarter: number,
): Promise<ActionResult<VatReturn>> {
  if (quarter < 1 || quarter > 4) return { error: "Ongeldig kwartaal." };
  if (!Number.isInteger(year) || year < 2020 || year > new Date().getFullYear()) {
    return { error: "Ongeldig jaar." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Check if return already exists
  const { data: existing, error: existingError } = await supabase
    .from("vat_returns")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("quarter", quarter)
    .single();

  if (existingError && existingError.code !== "PGRST116") {
    return {
      error: sanitizeSupabaseError(existingError, {
        area: "generateVatReturn.existingReturn",
        quarter,
        userId: user.id,
        year,
      }),
    };
  }

  if (existing && existing.status !== "draft") {
    return { error: "Er bestaat al een vergrendelde of ingediende aangifte voor dit kwartaal." };
  }

  // Quarter date range
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const qStart = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const qEnd = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  // Fetch invoices with lines
  const { data: invoices, error: invError } = await supabase
    .from("invoices")
    .select("id, subtotal_ex_vat, vat_amount, vat_rate, issue_date, is_credit_note, vat_scheme, invoice_lines(amount, vat_rate)")
    .eq("user_id", user.id)
    .in("status", ["sent", "paid"])
    .gte("issue_date", qStart)
    .lte("issue_date", qEnd);

  if (invError) {
    return {
      error: sanitizeSupabaseError(invError, {
        area: "generateVatReturn.fetchInvoices",
        quarter,
        userId: user.id,
        year,
      }),
    };
  }

  // Fetch receipts
  const { data: receipts, error: recError } = await supabase
    .from("receipts")
    .select("id, vat_amount, amount_ex_vat, business_percentage")
    .eq("user_id", user.id)
    .gte("receipt_date", qStart)
    .lte("receipt_date", qEnd);

  if (recError) {
    return {
      error: sanitizeSupabaseError(recError, {
        area: "generateVatReturn.fetchReceipts",
        quarter,
        userId: user.id,
        year,
      }),
    };
  }

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Calculate rubrieken
  const rubrieken = {
    "1a": { omzet: 0, btw: 0 },
    "1b": { omzet: 0, btw: 0 },
    "1c": { omzet: 0, btw: 0 },
    "2a": { omzet: 0, btw: 0 }, // ICP (intracommunautaire leveringen)
    "3b": { omzet: 0, btw: 0 }, // EU reverse charge services
    "4a": { omzet: 0, btw: 0 }, // Leveringen buiten EU
    "4b": { omzet: 0, btw: 0 }, // Diensten buiten EU
  };

  for (const inv of invoices ?? []) {
    const sign = inv.is_credit_note ? -1 : 1;
    const scheme = inv.vat_scheme ?? "standard";
    const lines = (inv as { invoice_lines?: { amount: number; vat_rate: number | null }[] }).invoice_lines;

    // Route to correct rubriek based on vat_scheme
    if (scheme === "eu_reverse_charge") {
      // ZZP'ers leveren diensten → rubriek 3b (diensten aan EU-ondernemers)
      // Rubriek 2a is uitsluitend voor intracommunautaire leveringen van goederen
      const amount = Number(inv.subtotal_ex_vat) || 0;
      rubrieken["3b"].omzet += sign * amount;
      continue;
    }

    if (scheme === "export_outside_eu") {
      // Buiten-EU: 4a = leveringen (goederen), 4b = diensten
      // For ZZP'ers (predominantly service providers), default to 4b
      const amount = Number(inv.subtotal_ex_vat) || 0;
      rubrieken["4b"].omzet += sign * amount;
      continue;
    }

    // Standard: categorize by VAT rate
    if (lines && lines.length > 0) {
      for (const line of lines) {
        const rate = line.vat_rate ?? inv.vat_rate ?? 21;
        const amount = Number(line.amount) || 0;
        const key = rate === 21 ? "1a" : rate === 9 ? "1b" : "1c";
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

  // Voorbelasting (5b)
  let voorbelasting = 0;
  for (const rec of receipts ?? []) {
    const pct = (rec.business_percentage ?? 100) / 100;
    voorbelasting += (Number(rec.vat_amount) || 0) * pct;
  }

  const returnData = {
    user_id: user.id,
    year,
    quarter,
    rubriek_1a_omzet: round2(rubrieken["1a"].omzet),
    rubriek_1a_btw: round2(rubrieken["1a"].btw),
    rubriek_1b_omzet: round2(rubrieken["1b"].omzet),
    rubriek_1b_btw: round2(rubrieken["1b"].btw),
    rubriek_1c_omzet: round2(rubrieken["1c"].omzet),
    rubriek_1c_btw: round2(rubrieken["1c"].btw),
    rubriek_2a_omzet: round2(rubrieken["2a"].omzet),
    rubriek_2a_btw: round2(rubrieken["2a"].btw),
    rubriek_3b_omzet: round2(rubrieken["3b"].omzet),
    rubriek_3b_btw: round2(rubrieken["3b"].btw),
    rubriek_4a_omzet: round2(rubrieken["4a"].omzet),
    rubriek_4a_btw: round2(rubrieken["4a"].btw),
    rubriek_4b_omzet: round2(rubrieken["4b"].omzet),
    rubriek_4b_btw: round2(rubrieken["4b"].btw),
    rubriek_5b: round2(voorbelasting),
    status: "draft" as VatReturnStatus,
  };

  // Upsert (update if draft exists, insert if new)
  let result;
  if (existing) {
    const { data, error } = await supabase
      .from("vat_returns")
      .update(returnData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) {
      return {
        error: sanitizeSupabaseError(error, {
          area: "generateVatReturn.updateDraftReturn",
          returnId: existing.id,
          userId: user.id,
        }),
      };
    }
    result = data;
  } else {
    const { data, error } = await supabase
      .from("vat_returns")
      .insert(returnData)
      .select()
      .single();
    if (error) {
      return {
        error: sanitizeSupabaseError(error, {
          area: "generateVatReturn.insertReturn",
          quarter,
          userId: user.id,
          year,
        }),
      };
    }
    result = data;
  }

  return { error: null, data: result as VatReturn };
}

/**
 * Lock a VAT return and link all relevant invoices/receipts in the quarter.
 */
export async function lockVatReturn(
  id: string,
): Promise<ActionResult<VatReturn>> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldige BTW-aangifte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Fetch the return
  const { data: vatReturn, error: fetchError } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") return { error: "BTW-aangifte niet gevonden." };

    return {
      error: sanitizeSupabaseError(fetchError, {
        area: "lockVatReturn.fetchReturn",
        returnId: id,
        userId: user.id,
      }),
    };
  }

  if (!vatReturn) return { error: "BTW-aangifte niet gevonden." };
  if (vatReturn.status !== "draft") return { error: "Alleen conceptaangiftes kunnen vergrendeld worden." };

  // Quarter date range
  const startMonth = (vatReturn.quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const qStart = `${vatReturn.year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(vatReturn.year, endMonth, 0).getDate();
  const qEnd = `${vatReturn.year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  // Link all invoices in the quarter to this return
  const { error: linkInvoicesError } = await supabase
    .from("invoices")
    .update({ vat_return_id: id })
    .eq("user_id", user.id)
    .in("status", ["sent", "paid"])
    .gte("issue_date", qStart)
    .lte("issue_date", qEnd)
    .is("vat_return_id", null);

  if (linkInvoicesError) {
    return {
      error: sanitizeSupabaseError(linkInvoicesError, {
        area: "lockVatReturn.linkInvoices",
        returnId: id,
        userId: user.id,
      }),
    };
  }

  // Link all receipts in the quarter to this return
  const { error: linkReceiptsError } = await supabase
    .from("receipts")
    .update({ vat_return_id: id })
    .eq("user_id", user.id)
    .gte("receipt_date", qStart)
    .lte("receipt_date", qEnd)
    .is("vat_return_id", null);

  if (linkReceiptsError) {
    return {
      error: sanitizeSupabaseError(linkReceiptsError, {
        area: "lockVatReturn.linkReceipts",
        returnId: id,
        userId: user.id,
      }),
    };
  }

  // Lock the return
  const { data: locked, error: lockError } = await supabase
    .from("vat_returns")
    .update({ status: "locked", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (lockError) {
    return {
      error: sanitizeSupabaseError(lockError, {
        area: "lockVatReturn.lockReturn",
        returnId: id,
        userId: user.id,
      }),
    };
  }
  return { error: null, data: locked as VatReturn };
}

/**
 * Submit a VAT return (mark as definitief).
 */
export async function submitVatReturn(
  id: string,
): Promise<ActionResult<VatReturn>> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldige BTW-aangifte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: vatReturn, error: fetchError } = await supabase
    .from("vat_returns")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") return { error: "BTW-aangifte niet gevonden." };

    return {
      error: sanitizeSupabaseError(fetchError, {
        area: "submitVatReturn.fetchReturn",
        returnId: id,
        userId: user.id,
      }),
    };
  }

  if (!vatReturn) return { error: "BTW-aangifte niet gevonden." };
  if (vatReturn.status === "submitted") return { error: "Aangifte is al ingediend." };
  if (vatReturn.status === "draft") return { error: "Vergrendel de aangifte eerst voordat je indient." };

  const { data: submitted, error: submitError } = await supabase
    .from("vat_returns")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (submitError) {
    return {
      error: sanitizeSupabaseError(submitError, {
        area: "submitVatReturn.submitReturn",
        returnId: id,
        userId: user.id,
      }),
    };
  }
  return { error: null, data: submitted as VatReturn };
}

/**
 * Get all VAT returns for the current user.
 */
export async function getVatReturns(): Promise<ActionResult<VatReturn[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "getVatReturns",
        userId: user.id,
      }),
    };
  }
  return { error: null, data: (data ?? []) as VatReturn[] };
}

/**
 * Auto-prepare BTW-aangifte voor het meest recente afgelopen kwartaal.
 * Wordt stil op de achtergrond aangeroepen vanuit het dashboard.
 * Genereert alleen een draft als er nog geen aangifte bestaat.
 */
export async function autoPreparePreviousQuarterVatReturn(): Promise<ActionResult<{ prepared: boolean; quarter?: number; year?: number }>> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Bepaal het meest recente afgelopen kwartaal
  let prevQuarter: number;
  let prevYear: number;
  if (currentMonth <= 3) {
    prevQuarter = 4;
    prevYear = currentYear - 1;
  } else if (currentMonth <= 6) {
    prevQuarter = 1;
    prevYear = currentYear;
  } else if (currentMonth <= 9) {
    prevQuarter = 2;
    prevYear = currentYear;
  } else {
    prevQuarter = 3;
    prevYear = currentYear;
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Check of er al een aangifte bestaat voor dit kwartaal
  const { data: existing } = await supabase
    .from("vat_returns")
    .select("id")
    .eq("user_id", user.id)
    .eq("year", prevYear)
    .eq("quarter", prevQuarter)
    .single();

  if (existing) {
    // Al voorbereid
    return { error: null, data: { prepared: false } };
  }

  // Genereer draft
  const result = await generateVatReturn(prevYear, prevQuarter);
  if (result.error) {
    return { error: null, data: { prepared: false } }; // Non-fatal
  }

  return { error: null, data: { prepared: true, quarter: prevQuarter, year: prevYear } };
}
