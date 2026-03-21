import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { getBtwOverview } from "@/lib/actions/tax";
import { generateVatReturnXml, validateVatReturnXml } from "@/lib/tax/xml-export";
import type { VatReturnXmlData } from "@/lib/tax/xml-export";

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
  const periodStart = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, startMonth + 3, 0);
  const periodEnd = `${year}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  // Fetch profile for BTW number
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, studio_name, btw_number")
    .eq("id", user.id)
    .single();

  // Fetch invoices for VAT rate breakdown (21% vs 9% vs 0%)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("subtotal_ex_vat, vat_amount, vat_rate")
    .eq("user_id", user.id)
    .in("status", ["sent", "paid"])
    .gte("issue_date", periodStart)
    .lte("issue_date", periodEnd);

  // Calculate VAT by rate
  let outputVat21 = 0;
  let outputVatBase21 = 0;
  let outputVat9 = 0;
  let outputVatBase9 = 0;
  let outputVat0 = 0;

  for (const inv of invoices ?? []) {
    const base = Number(inv.subtotal_ex_vat) || 0;
    const vat = Number(inv.vat_amount) || 0;
    const rate = Number(inv.vat_rate) || 0;

    if (rate === 21) {
      outputVatBase21 += base;
      outputVat21 += vat;
    } else if (rate === 9) {
      outputVatBase9 += base;
      outputVat9 += vat;
    } else {
      outputVat0 += base;
    }
  }

  const xmlData: VatReturnXmlData = {
    btwNumber: profile?.btw_number ?? "",
    companyName: profile?.studio_name ?? profile?.full_name ?? "",
    periodStart,
    periodEnd,
    outputVat21: Math.round(outputVat21 * 100) / 100,
    outputVatBase21: Math.round(outputVatBase21 * 100) / 100,
    outputVat9: Math.round(outputVat9 * 100) / 100,
    outputVatBase9: Math.round(outputVatBase9 * 100) / 100,
    outputVat0: Math.round(outputVat0 * 100) / 100,
    inputVat: Math.round(quarter.inputVat * 100) / 100,
    vatDue: Math.round(quarter.netVat * 100) / 100,
  };

  // Validate
  const errors = validateVatReturnXml(xmlData);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validatiefouten", details: errors },
      { status: 422 }
    );
  }

  const xml = generateVatReturnXml(xmlData);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="btw-aangifte-${quarterParam.replace(" ", "-")}.xml"`,
    },
  });
}
