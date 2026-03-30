import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Tool Handler Types ───

interface PeriodInput {
  period: "maand" | "kwartaal" | "jaar";
  year: number;
  quarter?: number;
  month?: number;
}

// ─── Helper: compute date range from period ───

function getDateRange(input: PeriodInput): { start: string; end: string } {
  const { period, year, quarter, month } = input;

  if (period === "jaar") {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  if (period === "kwartaal") {
    const q = quarter ?? Math.floor(new Date().getMonth() / 3) + 1;
    const startMonth = (q - 1) * 3;
    const s = new Date(year, startMonth, 1);
    const e = new Date(year, startMonth + 3, 0);
    return {
      start: s.toISOString().split("T")[0],
      end: e.toISOString().split("T")[0],
    };
  }
  // maand
  const m = (month ?? new Date().getMonth() + 1) - 1;
  const s = new Date(year, m, 1);
  const e = new Date(year, m + 1, 0);
  return {
    start: s.toISOString().split("T")[0],
    end: e.toISOString().split("T")[0],
  };
}

// ─── Main handler dispatcher ───

export async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  switch (toolName) {
    case "zoek_facturen":
      return handleZoekFacturen(input, userId, supabase);
    case "zoek_bonnetjes":
      return handleZoekBonnetjes(input, userId, supabase);
    case "zoek_banktransacties":
      return handleZoekBanktransacties(input, userId, supabase);
    case "bereken_omzet":
      return handleBerekenOmzet(input as unknown as PeriodInput, userId, supabase);
    case "bereken_btw":
      return handleBerekenBtw(input as unknown as PeriodInput, userId, supabase);
    case "klant_overzicht":
      return handleKlantOverzicht(input, userId, supabase);
    case "financieel_overzicht":
      return handleFinancieelOverzicht(input, userId, supabase);
    case "zoek_klanten":
      return handleZoekKlanten(input, userId, supabase);
    default:
      return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
  }
}

// ─── Individual handlers ───

async function handleZoekFacturen(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, due_date, subtotal_ex_vat, vat_amount, total_inc_vat, vat_rate, notes, is_credit_note, client:clients(name, email)")
    .eq("user_id", userId)
    .order("issue_date", { ascending: false });

  if (input.status) query = query.eq("status", input.status as string);
  if (input.date_from) query = query.gte("issue_date", input.date_from as string);
  if (input.date_to) query = query.lte("issue_date", input.date_to as string);
  query = query.limit((input.limit as number) ?? 20);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });

  // Filter by client name if provided (Supabase can't filter on joined fields easily)
  let results = data ?? [];
  if (input.client_name) {
    const search = (input.client_name as string).toLowerCase();
    results = results.filter((inv) => {
      const client = inv.client as unknown as { name: string } | null;
      return client?.name?.toLowerCase().includes(search);
    });
  }

  return JSON.stringify({
    aantal: results.length,
    facturen: results.map((inv) => ({
      factuurnummer: inv.invoice_number,
      status: inv.status,
      klant: (inv.client as unknown as { name: string } | null)?.name ?? "—",
      datum: inv.issue_date,
      vervaldatum: inv.due_date,
      bedrag_ex_btw: inv.subtotal_ex_vat,
      btw: inv.vat_amount,
      totaal_inc_btw: inv.total_inc_vat,
      btw_tarief: `${inv.vat_rate}%`,
      creditnota: inv.is_credit_note,
    })),
  });
}

async function handleZoekBonnetjes(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  let query = supabase
    .from("receipts")
    .select("id, vendor_name, amount_ex_vat, vat_amount, amount_inc_vat, vat_rate, category, cost_code, receipt_date")
    .eq("user_id", userId)
    .order("receipt_date", { ascending: false });

  if (input.category) query = query.eq("category", input.category as string);
  if (input.date_from) query = query.gte("receipt_date", input.date_from as string);
  if (input.date_to) query = query.lte("receipt_date", input.date_to as string);
  query = query.limit((input.limit as number) ?? 20);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });

  let results = data ?? [];
  if (input.vendor_name) {
    const search = (input.vendor_name as string).toLowerCase();
    results = results.filter((r) => r.vendor_name?.toLowerCase().includes(search));
  }

  const totaal = results.reduce((sum, r) => sum + (Number(r.amount_inc_vat) || 0), 0);

  return JSON.stringify({
    aantal: results.length,
    totaal_inc_btw: Math.round(totaal * 100) / 100,
    bonnetjes: results.map((r) => ({
      leverancier: r.vendor_name ?? "—",
      datum: r.receipt_date,
      bedrag_ex_btw: r.amount_ex_vat,
      btw: r.vat_amount,
      totaal_inc_btw: r.amount_inc_vat,
      categorie: r.category,
      btw_tarief: r.vat_rate != null ? `${r.vat_rate}%` : null,
    })),
  });
}

async function handleZoekBanktransacties(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  let query = supabase
    .from("bank_transactions")
    .select("id, booking_date, amount, currency, description, counterpart_name, category, is_income, linked_invoice_id, linked_receipt_id")
    .eq("user_id", userId)
    .order("booking_date", { ascending: false });

  if (input.date_from) query = query.gte("booking_date", input.date_from as string);
  if (input.date_to) query = query.lte("booking_date", input.date_to as string);
  if (input.is_income !== undefined) query = query.eq("is_income", input.is_income as boolean);
  if (input.category) query = query.eq("category", input.category as string);
  query = query.limit((input.limit as number) ?? 20);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });

  let results = data ?? [];
  if (input.counterpart_name) {
    const search = (input.counterpart_name as string).toLowerCase();
    results = results.filter((t) => t.counterpart_name?.toLowerCase().includes(search));
  }

  return JSON.stringify({
    aantal: results.length,
    transacties: results.map((t) => ({
      datum: t.booking_date,
      bedrag: t.amount,
      valuta: t.currency,
      omschrijving: t.description,
      tegenpartij: t.counterpart_name,
      categorie: t.category,
      type: t.is_income ? "inkomsten" : "uitgaven",
      gekoppeld_aan_factuur: !!t.linked_invoice_id,
      gekoppeld_aan_bon: !!t.linked_receipt_id,
    })),
  });
}

async function handleBerekenOmzet(
  input: PeriodInput,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { start, end } = getDateRange(input);

  const { data, error } = await supabase
    .from("invoices")
    .select("subtotal_ex_vat, vat_amount, total_inc_vat, vat_rate, issue_date")
    .eq("user_id", userId)
    .eq("status", "paid")
    .gte("issue_date", start)
    .lte("issue_date", end);

  if (error) return JSON.stringify({ error: error.message });

  const invoices = data ?? [];
  const totaalExBtw = invoices.reduce((sum, inv) => sum + (Number(inv.subtotal_ex_vat) || 0), 0);
  const totaalBtw = invoices.reduce((sum, inv) => sum + (Number(inv.vat_amount) || 0), 0);
  const totaalIncBtw = invoices.reduce((sum, inv) => sum + (Number(inv.total_inc_vat) || 0), 0);

  return JSON.stringify({
    periode: `${input.period} ${input.quarter ? `Q${input.quarter}` : input.month ? `maand ${input.month}` : ""} ${input.year}`.trim(),
    van: start,
    tot: end,
    aantal_facturen: invoices.length,
    omzet_ex_btw: Math.round(totaalExBtw * 100) / 100,
    btw_ontvangen: Math.round(totaalBtw * 100) / 100,
    omzet_inc_btw: Math.round(totaalIncBtw * 100) / 100,
  });
}

async function handleBerekenBtw(
  input: PeriodInput,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { start, end } = getDateRange(input);

  const [invoiceRes, receiptRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("vat_amount")
      .eq("user_id", userId)
      .in("status", ["sent", "paid"])
      .gte("issue_date", start)
      .lte("issue_date", end),
    supabase
      .from("receipts")
      .select("vat_amount")
      .eq("user_id", userId)
      .gte("receipt_date", start)
      .lte("receipt_date", end),
  ]);

  if (invoiceRes.error) return JSON.stringify({ error: invoiceRes.error.message });
  if (receiptRes.error) return JSON.stringify({ error: receiptRes.error.message });

  const btwOntvangen = (invoiceRes.data ?? []).reduce(
    (sum, inv) => sum + (Number(inv.vat_amount) || 0), 0
  );
  const btwBetaald = (receiptRes.data ?? []).reduce(
    (sum, rec) => sum + (Number(rec.vat_amount) || 0), 0
  );
  const btwAfdracht = btwOntvangen - btwBetaald;

  return JSON.stringify({
    periode: `${input.period} ${input.quarter ? `Q${input.quarter}` : input.month ? `maand ${input.month}` : ""} ${input.year}`.trim(),
    van: start,
    tot: end,
    btw_ontvangen_uit_facturen: Math.round(btwOntvangen * 100) / 100,
    btw_betaald_op_bonnetjes: Math.round(btwBetaald * 100) / 100,
    btw_afdracht: Math.round(btwAfdracht * 100) / 100,
    toelichting: btwAfdracht > 0
      ? `Je moet €${Math.round(btwAfdracht * 100) / 100} BTW afdragen.`
      : `Je kunt €${Math.round(Math.abs(btwAfdracht) * 100) / 100} BTW terugvragen.`,
  });
}

async function handleKlantOverzicht(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const search = (input.client_name as string).toLowerCase();

  // Find matching clients
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId);

  if (clientError) return JSON.stringify({ error: clientError.message });

  const matching = (clients ?? []).filter((c) =>
    c.name?.toLowerCase().includes(search)
  );

  if (matching.length === 0) {
    return JSON.stringify({ error: `Geen klant gevonden met naam "${input.client_name}"` });
  }

  // Get invoices for matched clients
  const clientIds = matching.map((c) => c.id);
  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_number, status, issue_date, due_date, subtotal_ex_vat, vat_amount, total_inc_vat")
    .eq("user_id", userId)
    .in("client_id", clientIds)
    .order("issue_date", { ascending: false });

  const inv = invoices ?? [];
  const totaalOmzet = inv
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);
  const openstaand = inv
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);

  return JSON.stringify({
    klanten: matching.map((c) => ({
      naam: c.name,
      contactpersoon: c.contact_name,
      email: c.email,
      adres: [c.address, c.postal_code, c.city].filter(Boolean).join(", "),
      kvk: c.kvk_number,
      btw_nummer: c.btw_number,
    })),
    facturen: inv.map((i) => ({
      factuurnummer: i.invoice_number,
      status: i.status,
      datum: i.issue_date,
      totaal: i.total_inc_vat,
    })),
    samenvatting: {
      aantal_facturen: inv.length,
      totaal_omzet_betaald: Math.round(totaalOmzet * 100) / 100,
      openstaand_bedrag: Math.round(openstaand * 100) / 100,
    },
  });
}

async function handleFinancieelOverzicht(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const year = (input.year as number) ?? new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const [invoiceRes, receiptRes, openRes, bankRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("subtotal_ex_vat, vat_amount, total_inc_vat, status, issue_date")
      .eq("user_id", userId)
      .gte("issue_date", start)
      .lte("issue_date", end),
    supabase
      .from("receipts")
      .select("amount_ex_vat, vat_amount, amount_inc_vat, receipt_date, category")
      .eq("user_id", userId)
      .gte("receipt_date", start)
      .lte("receipt_date", end),
    supabase
      .from("invoices")
      .select("total_inc_vat")
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"]),
    supabase
      .from("bank_transactions")
      .select("amount")
      .eq("user_id", userId),
  ]);

  if (invoiceRes.error) return JSON.stringify({ error: invoiceRes.error.message });

  const allInvoices = invoiceRes.data ?? [];
  const paidInvoices = allInvoices.filter((i) => i.status === "paid");
  const receipts = receiptRes.data ?? [];
  const openInvoices = openRes.data ?? [];
  const bankTx = bankRes.data ?? [];

  const omzetExBtw = paidInvoices.reduce((s, i) => s + (Number(i.subtotal_ex_vat) || 0), 0);
  const btwOntvangen = paidInvoices.reduce((s, i) => s + (Number(i.vat_amount) || 0), 0);
  const kostenExBtw = receipts.reduce((s, r) => s + (Number(r.amount_ex_vat) || 0), 0);
  const btwBetaald = receipts.reduce((s, r) => s + (Number(r.vat_amount) || 0), 0);
  const openstaand = openInvoices.reduce((s, i) => s + (Number(i.total_inc_vat) || 0), 0);
  const banksaldo = bankTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Kosten per categorie
  const categorieMap = new Map<string, number>();
  for (const r of receipts) {
    const cat = r.category ?? "Overig";
    categorieMap.set(cat, (categorieMap.get(cat) ?? 0) + (Number(r.amount_inc_vat) || 0));
  }
  const kostenPerCategorie = Object.fromEntries(
    [...categorieMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, Math.round(v * 100) / 100])
  );

  return JSON.stringify({
    jaar: year,
    omzet: {
      aantal_facturen: paidInvoices.length,
      omzet_ex_btw: Math.round(omzetExBtw * 100) / 100,
      btw_ontvangen: Math.round(btwOntvangen * 100) / 100,
    },
    kosten: {
      aantal_bonnetjes: receipts.length,
      kosten_ex_btw: Math.round(kostenExBtw * 100) / 100,
      btw_betaald: Math.round(btwBetaald * 100) / 100,
      per_categorie: kostenPerCategorie,
    },
    resultaat: {
      winst_ex_btw: Math.round((omzetExBtw - kostenExBtw) * 100) / 100,
      btw_afdracht: Math.round((btwOntvangen - btwBetaald) * 100) / 100,
    },
    openstaand: {
      aantal_facturen: openInvoices.length,
      totaal_bedrag: Math.round(openstaand * 100) / 100,
    },
    banksaldo: Math.round(banksaldo * 100) / 100,
  });
}

async function handleZoekKlanten(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  let query = supabase
    .from("clients")
    .select("name, contact_name, email, address, city, postal_code, kvk_number, btw_number")
    .eq("user_id", userId)
    .order("name");

  query = query.limit((input.limit as number) ?? 20);

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });

  let results = data ?? [];
  if (input.name) {
    const search = (input.name as string).toLowerCase();
    results = results.filter((c) => c.name?.toLowerCase().includes(search));
  }

  return JSON.stringify({
    aantal: results.length,
    klanten: results.map((c) => ({
      naam: c.name,
      contactpersoon: c.contact_name,
      email: c.email,
      adres: [c.address, c.postal_code, c.city].filter(Boolean).join(", "),
      kvk: c.kvk_number,
      btw_nummer: c.btw_number,
    })),
  });
}
