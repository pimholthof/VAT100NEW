"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Profile } from "@/lib/types";
import {
  calculateZZPTaxProjection,
  type TaxProjection,
  type Investment,
  type DepreciationRow,
} from "@/lib/tax/dutch-tax-2026";
import { KOSTENSOORTEN, type Kostensoort } from "@/lib/constants/costs";
import type { QuarterStats } from "./actions";

// ─── Types ───

export interface KostenGroep {
  groep: string;
  regels: { label: string; code: number; bedrag: number }[];
  subtotaal: number;
}

export interface JaarrekeningData {
  jaar: number;
  isVoorlopig: boolean;

  profiel: {
    studioName: string;
    fullName: string;
    kvkNumber: string | null;
    btwNumber: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    iban: string | null;
  };

  // Winst- en verliesrekening
  winstEnVerlies: {
    omzetExBtw: number;
    creditnota: number;
    nettoOmzet: number;
    kostenGroepen: KostenGroep[];
    totaalKosten: number;
    afschrijvingen: number;
    brutoWinst: number;
  };

  // Balans (vereenvoudigd)
  balans: {
    bankSaldo: number;
    debiteuren: number;
    vasteActiva: number;
    totaalActiva: number;
    btwSchuld: number;
    belastingVoorziening: number;
    eigenVermogen: number;
    totaalPassiva: number;
    heeftBankData: boolean;
  };

  // BTW jaaroverzicht
  btwKwartalen: QuarterStats[];
  btwJaarTotaal: {
    omzetExBtw: number;
    outputBtw: number;
    inputBtw: number;
    nettoBtw: number;
  };

  // Fiscale samenvatting
  fiscaal: TaxProjection;

  // Investeringen & afschrijvingen
  investeringen: DepreciationRow[];

  // Statistieken
  factuurAantal: number;
  bonnenAantal: number;
}

// ─── Helpers ───

function getQuarterKey(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function groupKosten(
  receipts: { amount_ex_vat: number | null; cost_code: number | null }[],
): KostenGroep[] {
  // Tally per cost_code
  const codeMap = new Map<number, number>();
  for (const r of receipts) {
    const code = r.cost_code ?? 4999;
    const amount = Number(r.amount_ex_vat) || 0;
    codeMap.set(code, (codeMap.get(code) || 0) + amount);
  }

  // Group by groep
  const groepMap = new Map<string, KostenGroep>();
  const kostenLookup = new Map<number, Kostensoort>();
  for (const k of KOSTENSOORTEN) kostenLookup.set(k.code, k);

  for (const [code, bedrag] of codeMap) {
    const soort = kostenLookup.get(code) ?? {
      label: "Overige bedrijfskosten",
      code: 4999,
      groep: "Overig",
    };

    let groep = groepMap.get(soort.groep);
    if (!groep) {
      groep = { groep: soort.groep, regels: [], subtotaal: 0 };
      groepMap.set(soort.groep, groep);
    }

    groep.regels.push({ label: soort.label, code: soort.code, bedrag: round2(bedrag) });
    groep.subtotaal = round2(groep.subtotaal + bedrag);
  }

  // Sort by groep name, regels by bedrag desc
  const result = Array.from(groepMap.values());
  result.sort((a, b) => a.groep.localeCompare(b.groep));
  for (const g of result) g.regels.sort((a, b) => b.bedrag - a.bedrag);

  return result;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ─── Main server action ───

export async function getJaarrekeningData(
  year: number,
): Promise<ActionResult<JaarrekeningData>> {
  const currentYear = new Date().getFullYear();

  if (!Number.isInteger(year) || year < 2020 || year > currentYear) {
    return { error: "Ongeldig jaar." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [
    invoicesRes,
    receiptsRes,
    investmentReceiptsRes,
    openInvoicesRes,
    profileRes,
    bankRes,
  ] = await Promise.all([
    // Facturen dit jaar (sent/paid)
    supabase
      .from("invoices")
      .select(
        "subtotal_ex_vat, vat_amount, total_inc_vat, status, issue_date",
      )
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", yearStart)
      .lte("issue_date", yearEnd),

    // Bonnen dit jaar (excl. investeringen cost_code 4230)
    supabase
      .from("receipts")
      .select("amount_ex_vat, vat_amount, cost_code, receipt_date")
      .eq("user_id", user.id)
      .gte("receipt_date", yearStart)
      .lte("receipt_date", yearEnd),

    // Alle investeringen ooit (voor afschrijving)
    supabase
      .from("receipts")
      .select("id, vendor_name, amount_ex_vat, receipt_date")
      .eq("user_id", user.id)
      .eq("cost_code", 4230)
      .not("amount_ex_vat", "is", null)
      .not("receipt_date", "is", null),

    // Openstaande facturen op 31/12 (debiteuren)
    supabase
      .from("invoices")
      .select("total_inc_vat")
      .eq("user_id", user.id)
      .in("status", ["sent", "overdue"])
      .lte("issue_date", yearEnd),

    // Profiel
    supabase
      .from("profiles")
      .select(
        "full_name, studio_name, kvk_number, btw_number, address, city, postal_code, iban",
      )
      .eq("id", user.id)
      .single(),

    // Banktransacties t/m einde jaar
    supabase
      .from("bank_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .lte("booking_date", yearEnd),
  ]);

  if (invoicesRes.error) return { error: invoicesRes.error.message };
  if (receiptsRes.error) return { error: receiptsRes.error.message };
  if (investmentReceiptsRes.error)
    return { error: investmentReceiptsRes.error.message };

  const invoices = invoicesRes.data ?? [];
  const allReceipts = receiptsRes.data ?? [];
  const openInvoices = openInvoicesRes.data ?? [];
  const profile = (profileRes.data ?? {}) as Partial<Profile>;
  const bankTransactions = bankRes.data ?? [];

  // ─── Winst- en verliesrekening ───

  // Credit notes hebben een negatief total_inc_vat / subtotal — als is_credit_note
  // kolom niet bestaat, behandelen we alle facturen als regulier
  type InvoiceRow = (typeof invoices)[number];
  const hasCreditNoteCol = invoices.length > 0 && "is_credit_note" in invoices[0];
  const regularInvoices = hasCreditNoteCol
    ? invoices.filter((i) => !(i as InvoiceRow & { is_credit_note?: boolean }).is_credit_note)
    : invoices;
  const creditNotes = hasCreditNoteCol
    ? invoices.filter((i) => (i as InvoiceRow & { is_credit_note?: boolean }).is_credit_note)
    : [];

  const omzetExBtw = round2(
    regularInvoices.reduce(
      (s, i) => s + (Number(i.subtotal_ex_vat) || 0),
      0,
    ),
  );
  const creditnota = round2(
    creditNotes.reduce((s, i) => s + (Number(i.subtotal_ex_vat) || 0), 0),
  );
  const nettoOmzet = round2(omzetExBtw - creditnota);

  // Split receipts: reguliere kosten vs investeringen
  const reguliereKosten = allReceipts.filter(
    (r) => r.cost_code !== 4230,
  );
  const kostenGroepen = groupKosten(reguliereKosten);
  const totaalKosten = round2(
    reguliereKosten.reduce(
      (s, r) => s + (Number(r.amount_ex_vat) || 0),
      0,
    ),
  );

  // Investeringen → Investment objecten voor belastingberekening
  const investeringen: Investment[] = (investmentReceiptsRes.data ?? []).map(
    (rec) => ({
      id: rec.id,
      omschrijving: rec.vendor_name ?? "Investering",
      aanschafprijs: Number(rec.amount_ex_vat) || 0,
      aanschafDatum: rec.receipt_date!,
      levensduur: 5,
      restwaarde: 0,
    }),
  );

  // Belastingprojectie
  const fiscaal = calculateZZPTaxProjection({
    jaarOmzetExBtw: nettoOmzet,
    jaarKostenExBtw: totaalKosten,
    investeringen,
    maandenVerstreken: year < currentYear ? 12 : new Date().getMonth() + 1,
    huidigJaar: year,
  });

  // ─── BTW per kwartaal ───

  const quarterMap = new Map<string, QuarterStats>();
  const getOrCreate = (key: string): QuarterStats => {
    let q = quarterMap.get(key);
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
      quarterMap.set(key, q);
    }
    return q;
  };

  // Ensure all 4 quarters exist
  for (let qi = 1; qi <= 4; qi++) getOrCreate(`Q${qi} ${year}`);

  for (const inv of invoices) {
    if (!inv.issue_date) continue;
    const q = getOrCreate(getQuarterKey(inv.issue_date));
    const isCN = hasCreditNoteCol && (inv as InvoiceRow & { is_credit_note?: boolean }).is_credit_note;
    const sign = isCN ? -1 : 1;
    q.revenueExVat += sign * (Number(inv.subtotal_ex_vat) || 0);
    q.outputVat += sign * (Number(inv.vat_amount) || 0);
    q.invoiceCount += 1;
  }

  for (const rec of allReceipts) {
    if (!rec.receipt_date) continue;
    const q = getOrCreate(getQuarterKey(rec.receipt_date));
    q.inputVat += Number(rec.vat_amount) || 0;
    q.receiptCount += 1;
  }

  const btwKwartalen: QuarterStats[] = [];
  const btwJaarTotaal = { omzetExBtw: 0, outputBtw: 0, inputBtw: 0, nettoBtw: 0 };

  for (let qi = 1; qi <= 4; qi++) {
    const q = quarterMap.get(`Q${qi} ${year}`)!;
    q.revenueExVat = round2(q.revenueExVat);
    q.outputVat = round2(q.outputVat);
    q.inputVat = round2(q.inputVat);
    q.netVat = round2(q.outputVat - q.inputVat);

    btwKwartalen.push(q);
    btwJaarTotaal.omzetExBtw += q.revenueExVat;
    btwJaarTotaal.outputBtw += q.outputVat;
    btwJaarTotaal.inputBtw += q.inputVat;
    btwJaarTotaal.nettoBtw += q.netVat;
  }

  btwJaarTotaal.omzetExBtw = round2(btwJaarTotaal.omzetExBtw);
  btwJaarTotaal.outputBtw = round2(btwJaarTotaal.outputBtw);
  btwJaarTotaal.inputBtw = round2(btwJaarTotaal.inputBtw);
  btwJaarTotaal.nettoBtw = round2(btwJaarTotaal.nettoBtw);

  // ─── Balans ───

  const heeftBankData = bankTransactions.length > 0;
  const bankSaldo = round2(
    bankTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
  );
  const debiteuren = round2(
    openInvoices.reduce(
      (s, i) => s + (Number(i.total_inc_vat) || 0),
      0,
    ),
  );
  const vasteActiva = round2(
    fiscaal.afschrijvingDetails.reduce((s, d) => s + d.boekwaarde, 0),
  );
  const totaalActiva = round2(bankSaldo + debiteuren + vasteActiva);

  const btwSchuld = Math.max(0, btwJaarTotaal.nettoBtw);
  const belastingVoorziening = fiscaal.nettoIB;
  const eigenVermogen = round2(totaalActiva - btwSchuld - belastingVoorziening);
  const totaalPassiva = round2(btwSchuld + belastingVoorziening + eigenVermogen);

  return {
    error: null,
    data: {
      jaar: year,
      isVoorlopig: year === currentYear,

      profiel: {
        studioName: profile.studio_name ?? profile.full_name ?? "Studio",
        fullName: profile.full_name ?? "",
        kvkNumber: profile.kvk_number ?? null,
        btwNumber: profile.btw_number ?? null,
        address: profile.address ?? null,
        city: profile.city ?? null,
        postalCode: profile.postal_code ?? null,
        iban: profile.iban ?? null,
      },

      winstEnVerlies: {
        omzetExBtw,
        creditnota,
        nettoOmzet,
        kostenGroepen,
        totaalKosten,
        afschrijvingen: fiscaal.afschrijvingen,
        brutoWinst: fiscaal.brutoWinst,
      },

      balans: {
        bankSaldo,
        debiteuren,
        vasteActiva,
        totaalActiva,
        btwSchuld,
        belastingVoorziening,
        eigenVermogen,
        totaalPassiva,
        heeftBankData,
      },

      btwKwartalen,
      btwJaarTotaal,

      fiscaal,
      investeringen: fiscaal.afschrijvingDetails,

      factuurAantal: invoices.length,
      bonnenAantal: allReceipts.length,
    },
  };
}
