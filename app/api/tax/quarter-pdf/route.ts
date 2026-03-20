import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAuth } from "@/lib/supabase/server";
import { VatReturnPDF } from "@/components/tax/VatReturnPDF";
import { getBtwOverview } from "@/lib/actions/tax";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error !== null) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { supabase, user } = auth;

  const quarterParam = request.nextUrl.searchParams.get("quarter");
  if (!quarterParam) {
    return NextResponse.json({ error: "Kwartaal is verplicht" }, { status: 400 });
  }

  // Get BTW overview to find the quarter
  const btwResult = await getBtwOverview();
  if (btwResult.error || !btwResult.data) {
    return NextResponse.json({ error: btwResult.error }, { status: 500 });
  }

  const quarter = btwResult.data.find((q) => q.quarter === quarterParam);
  if (!quarter) {
    return NextResponse.json({ error: "Kwartaal niet gevonden" }, { status: 404 });
  }

  // Parse quarter string to get date range
  const match = quarterParam.match(/Q(\d)\s(\d{4})/);
  if (!match) {
    return NextResponse.json({ error: "Ongeldig kwartaal formaat" }, { status: 400 });
  }

  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  const startMonth = (q - 1) * 3;
  const startDate = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endMonth = q * 3;
  const endDate = endMonth === 12
    ? `${year}-12-31`
    : `${year}-${String(endMonth + 1).padStart(2, "0")}-01`;

  // Fetch profile and invoices/receipts for this quarter
  const [profileResult, invoicesResult, receiptsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, studio_name, btw_number, kvk_number, address, city, postal_code")
      .eq("id", user.id)
      .single(),
    supabase
      .from("invoices")
      .select("invoice_number, issue_date, subtotal_ex_vat, vat_amount, client:clients(name)")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", startDate)
      .lt("issue_date", endDate),
    supabase
      .from("receipts")
      .select("vendor_name, receipt_date, amount_ex_vat, vat_amount")
      .eq("user_id", user.id)
      .gte("receipt_date", startDate)
      .lt("receipt_date", endDate),
  ]);

  const profile = profileResult.data ?? {
    full_name: "",
    studio_name: null,
    btw_number: null,
    kvk_number: null,
    address: null,
    city: null,
    postal_code: null,
  };

  interface InvoiceRow {
    invoice_number: string;
    issue_date: string;
    subtotal_ex_vat: number;
    vat_amount: number;
    client: { name: string } | null;
  }

  const invoices = ((invoicesResult.data ?? []) as unknown as InvoiceRow[]).map((inv) => ({
    invoice_number: inv.invoice_number,
    issue_date: inv.issue_date,
    client_name: inv.client?.name ?? "—",
    subtotal_ex_vat: Number(inv.subtotal_ex_vat) || 0,
    vat_amount: Number(inv.vat_amount) || 0,
  }));

  const receipts = (receiptsResult.data ?? []).map((rec) => ({
    vendor_name: rec.vendor_name as string | null,
    receipt_date: rec.receipt_date as string | null,
    amount_ex_vat: Number(rec.amount_ex_vat) || 0,
    vat_amount: Number(rec.vat_amount) || 0,
  }));

  const buffer = await renderToBuffer(
    VatReturnPDF({ quarter, profile, invoices, receipts })
  );

  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="btw-overzicht-${quarterParam.replace(" ", "-")}.pdf"`,
    },
  });
}
