import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { sanitizeSupabaseError } from "@/lib/errors";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { isRateLimited } from "@/lib/rate-limit";
import { EXPENSE_ACCOUNTS } from "@/lib/tax/chart-of-accounts";
import {
  ACCOUNTANT_INVOICE_HEADERS,
  ACCOUNTANT_RECEIPT_HEADERS,
  buildInvoiceRows,
  buildReceiptRows,
  type AccountantInvoiceRow,
  type AccountantReceiptRow,
} from "@/lib/export/accountant-csv";

/**
 * Boekhouder-export: CSV in memoriaalboeking-formaat met grootboekrekeningen
 * en BTW-codes. Compatibel met Twinfield, Exact Online en Snelstart.
 *
 * Querystring:
 *   ?type=invoices   — uitgaande facturen (default)
 *   ?type=receipts   — bonnen / kosten
 *   ?year=2026       — optioneel, filtert op jaar
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error !== null)
    return NextResponse.json({ error: auth.error }, { status: 401 });
  const { supabase, user } = auth;

  if (await isRateLimited(`export:${user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Te veel exports. Probeer het later opnieuw." },
      { status: 429 }
    );
  }

  const type = request.nextUrl.searchParams.get("type") ?? "invoices";
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number.parseInt(yearParam, 10) : null;
  const validYear = year && year >= 2000 && year <= 2100 ? year : null;

  if (type !== "invoices" && type !== "receipts") {
    return NextResponse.json(
      { error: "Ongeldig type. Gebruik 'invoices' of 'receipts'." },
      { status: 400 }
    );
  }

  if (type === "invoices") {
    let query = supabase
      .from("invoices")
      .select(
        "invoice_number, issue_date, status, subtotal_ex_vat, vat_amount, total_inc_vat, vat_rate, vat_scheme, notes, client:clients(name)"
      )
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("issue_date", { ascending: true });

    if (validYear) {
      query = query
        .gte("issue_date", `${validYear}-01-01`)
        .lt("issue_date", `${validYear + 1}-01-01`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        {
          error: sanitizeSupabaseError(error, {
            area: "exportAccountantInvoices",
            userId: user.id,
          }),
        },
        { status: 500 }
      );
    }

    const mapped: AccountantInvoiceRow[] = (data ?? []).map((inv) => {
      const clientObj = inv.client as { name: string } | { name: string }[] | null;
      const clientName = Array.isArray(clientObj)
        ? clientObj[0]?.name ?? ""
        : clientObj?.name ?? "";
      return {
        invoice_number: inv.invoice_number ?? "",
        issue_date: inv.issue_date ?? null,
        client_name: clientName,
        description: (inv.notes as string) ?? "",
        subtotal_ex_vat: Number(inv.subtotal_ex_vat) || 0,
        vat_amount: Number(inv.vat_amount) || 0,
        total_inc_vat: Number(inv.total_inc_vat) || 0,
        vat_rate: Number(inv.vat_rate) || 0,
        vat_scheme: (inv.vat_scheme as string) ?? "standard",
        status: inv.status ?? null,
      };
    });

    const csv = generateCSV(
      ACCOUNTANT_INVOICE_HEADERS,
      buildInvoiceRows(mapped)
    );
    const suffix = validYear ? `-${validYear}` : "";
    return csvResponse(
      csv,
      `boekhouder-facturen${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  // type === "receipts"
  let receiptsQuery = supabase
    .from("receipts")
    .select(
      "receipt_date, vendor_name, amount_ex_vat, vat_amount, amount_inc_vat, vat_rate, business_percentage, cost_code, category"
    )
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("receipt_date", { ascending: true });

  if (validYear) {
    receiptsQuery = receiptsQuery
      .gte("receipt_date", `${validYear}-01-01`)
      .lt("receipt_date", `${validYear + 1}-01-01`);
  }

  const { data, error } = await receiptsQuery;
  if (error) {
    return NextResponse.json(
      {
        error: sanitizeSupabaseError(error, {
          area: "exportAccountantReceipts",
          userId: user.id,
        }),
      },
      { status: 500 }
    );
  }

  const expenseNameByCode = new Map(
    EXPENSE_ACCOUNTS.map((a) => [a.code, a.name])
  );

  const mapped: AccountantReceiptRow[] = (data ?? []).map((r) => ({
    receipt_date: r.receipt_date ?? null,
    vendor_name: r.vendor_name ?? "",
    description: (r.category as string) ?? "",
    subtotal_ex_vat: Number(r.amount_ex_vat) || 0,
    vat_amount: Number(r.vat_amount) || 0,
    total_inc_vat: Number(r.amount_inc_vat) || 0,
    vat_rate: Number(r.vat_rate) || 0,
    business_percentage: Number(r.business_percentage ?? 100),
    cost_code: (r.cost_code as number | null) ?? null,
    cost_code_name:
      r.cost_code != null
        ? expenseNameByCode.get(r.cost_code as number) ?? null
        : null,
  }));

  const csv = generateCSV(
    ACCOUNTANT_RECEIPT_HEADERS,
    buildReceiptRows(mapped)
  );
  const suffix = validYear ? `-${validYear}` : "";
  return csvResponse(
    csv,
    `boekhouder-bonnen${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
  );
}
