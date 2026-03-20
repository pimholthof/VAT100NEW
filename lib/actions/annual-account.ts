"use server";

import { requireAuth } from "@/lib/supabase/server";
import { calculateAnnualFigures } from "@/lib/annual-account/calculate-figures";
import { generateAnnualAccountPdfs } from "@/lib/annual-account/pdf/generate-pdf";
import type { ActionResult } from "@/lib/types";
import type {
  AnnualAccount,
  AnnualFigures,
  RawFinancialData,
  RawProfile,
} from "@/lib/annual-account/types";

// ─── Get annual account for a fiscal year ───

export async function getAnnualAccount(
  fiscalYear: number
): Promise<ActionResult<AnnualAccount | null>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("annual_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("fiscal_year", fiscalYear)
    .maybeSingle();

  if (error) return { error: error.message };
  return { error: null, data: data as AnnualAccount | null };
}

// ─── List all annual accounts for user ───

export async function listAnnualAccounts(): Promise<
  ActionResult<AnnualAccount[]>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("annual_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("fiscal_year", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as AnnualAccount[] };
}

// ─── Fetch raw financial data for calculation ───

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

async function fetchFinancialData(
  supabase: SupabaseClient,
  userId: string,
  fiscalYear: number
): Promise<RawFinancialData> {
  const yearStart = `${fiscalYear}-01-01`;
  const yearEnd = `${fiscalYear}-12-31`;

  const [
    { data: invoicesData },
    { data: expensesData },
    { data: bankData },
    { data: assetsData },
    { data: profileData },
    { data: priorAccount },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, subtotal_ex_vat, vat_amount, vat_rate, status, client:clients(name)")
      .eq("user_id", userId)
      .gte("issue_date", yearStart)
      .lte("issue_date", yearEnd),
    supabase
      .from("receipts")
      .select("id, vendor_name, amount_ex_vat, vat_amount, category, receipt_date")
      .eq("user_id", userId)
      .gte("receipt_date", yearStart)
      .lte("receipt_date", yearEnd),
    supabase
      .from("bank_transactions")
      .select("id, booking_date, amount, description, counterpart_name")
      .eq("user_id", userId)
      .lte("booking_date", yearEnd)
      .order("booking_date", { ascending: true }),
    // Assets — no date filter, the calculation engine handles relevance
    supabase
      .from("assets")
      .select("id, description, acquisition_date, acquisition_cost, residual_value, depreciation_rate, useful_life_months")
      .eq("user_id", userId),
    supabase
      .from("profiles")
      .select("full_name, studio_name, kvk_number, btw_number, address, city, postal_code, iban, bic")
      .eq("id", userId)
      .single(),
    // Prior year annual account (for comparison)
    supabase
      .from("annual_accounts")
      .select("figures")
      .eq("user_id", userId)
      .eq("fiscal_year", fiscalYear - 1)
      .maybeSingle(),
  ]);

  // Map invoice rows (handle join shape)
  interface InvoiceRow {
    id: string;
    invoice_number: string;
    issue_date: string;
    subtotal_ex_vat: number;
    vat_amount: number;
    vat_rate: number;
    status: string;
    client: { name: string } | null;
  }

  const invoices = ((invoicesData ?? []) as unknown as InvoiceRow[]).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    issue_date: inv.issue_date,
    subtotal_ex_vat: Number(inv.subtotal_ex_vat) || 0,
    vat_amount: Number(inv.vat_amount) || 0,
    vat_rate: Number(inv.vat_rate) || 0,
    status: inv.status,
    client_name: inv.client?.name ?? "—",
  }));

  const expenses = (expensesData ?? []).map((exp) => ({
    id: exp.id as string,
    vendor_name: exp.vendor_name as string | null,
    amount_ex_vat: Number(exp.amount_ex_vat) || 0,
    vat_amount: Number(exp.vat_amount) || 0,
    category: exp.category as string | null,
    receipt_date: exp.receipt_date as string | null,
  }));

  const bankTransactions = (bankData ?? []).map((tx) => ({
    id: tx.id as string,
    booking_date: tx.booking_date as string,
    amount: Number(tx.amount) || 0,
    description: tx.description as string | null,
    counterpart_name: tx.counterpart_name as string | null,
  }));

  const assets = (assetsData ?? []).map((a) => ({
    id: a.id as string,
    description: a.description as string,
    acquisition_date: a.acquisition_date as string,
    acquisition_cost: Number(a.acquisition_cost) || 0,
    residual_value: Number(a.residual_value) || 0,
    depreciation_rate: Number(a.depreciation_rate) || 0,
    useful_life_months: Number(a.useful_life_months) || 0,
  }));

  const profile: RawProfile = {
    full_name: profileData?.full_name ?? "",
    studio_name: profileData?.studio_name ?? null,
    kvk_number: profileData?.kvk_number ?? null,
    btw_number: profileData?.btw_number ?? null,
    address: profileData?.address ?? null,
    city: profileData?.city ?? null,
    postal_code: profileData?.postal_code ?? null,
    iban: profileData?.iban ?? null,
    bic: profileData?.bic ?? null,
  };

  const priorYearFigures = priorAccount?.figures
    ? (priorAccount.figures as unknown as AnnualFigures)
    : null;

  return {
    invoices,
    expenses,
    bankTransactions,
    vatDeclarations: [], // VAT declarations table may not exist yet
    assets,
    profile,
    priorYearFigures,
  };
}

// ─── Generate annual account ───

export interface GenerateResult {
  account: AnnualAccount;
  figures: AnnualFigures;
}

export async function generateAnnualAccount(
  fiscalYear: number
): Promise<ActionResult<GenerateResult>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (fiscalYear < 2020 || fiscalYear > new Date().getFullYear()) {
    return { error: "Ongeldig boekjaar." };
  }

  // Fetch all financial data
  const rawData = await fetchFinancialData(supabase, user.id, fiscalYear);

  // Calculate figures
  const figures = calculateAnnualFigures(fiscalYear, rawData);

  // Generate PDFs
  let pdfNlPath: string | null = null;
  let pdfEnPath: string | null = null;

  try {
    const pdfs = await generateAnnualAccountPdfs(figures, rawData.profile);

    const nlFileName = `annual-accounts/${user.id}/${fiscalYear}/jaarbericht-${fiscalYear}-nl.pdf`;
    const enFileName = `annual-accounts/${user.id}/${fiscalYear}/jaarbericht-${fiscalYear}-en.pdf`;

    const [nlUpload, enUpload] = await Promise.all([
      supabase.storage
        .from("documents")
        .upload(nlFileName, pdfs.nl, {
          contentType: "application/pdf",
          upsert: true,
        }),
      supabase.storage
        .from("documents")
        .upload(enFileName, pdfs.en, {
          contentType: "application/pdf",
          upsert: true,
        }),
    ]);

    if (!nlUpload.error) pdfNlPath = nlFileName;
    if (!enUpload.error) pdfEnPath = enFileName;
  } catch {
    // PDF generation or upload failed — continue without PDFs
    // The figures are still saved so user can retry PDF generation later
  }

  // Upsert annual_accounts row
  const { data: account, error } = await supabase
    .from("annual_accounts")
    .upsert(
      {
        user_id: user.id,
        fiscal_year: fiscalYear,
        status: "draft",
        figures: figures as unknown as Record<string, unknown>,
        pdf_nl_path: pdfNlPath,
        pdf_en_path: pdfEnPath,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,fiscal_year" }
    )
    .select()
    .single();

  if (error) return { error: error.message };

  return {
    error: null,
    data: {
      account: account as unknown as AnnualAccount,
      figures,
    },
  };
}

// ─── Download PDF (returns signed URL) ───

export async function getAnnualAccountPdfUrl(
  fiscalYear: number,
  lang: "nl" | "en"
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: account } = await supabase
    .from("annual_accounts")
    .select("pdf_nl_path, pdf_en_path")
    .eq("user_id", user.id)
    .eq("fiscal_year", fiscalYear)
    .single();

  if (!account) return { error: "Jaarrekening niet gevonden." };

  const path = lang === "nl" ? account.pdf_nl_path : account.pdf_en_path;
  if (!path) return { error: "PDF niet beschikbaar. Genereer de jaarrekening opnieuw." };

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path as string, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    return { error: "Kon download-link niet aanmaken." };
  }

  return { error: null, data: data.signedUrl };
}

// ─── Preview figures without saving ───

export async function previewAnnualFigures(
  fiscalYear: number
): Promise<ActionResult<AnnualFigures>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const rawData = await fetchFinancialData(supabase, user.id, fiscalYear);
  const figures = calculateAnnualFigures(fiscalYear, rawData);

  return { error: null, data: figures };
}
