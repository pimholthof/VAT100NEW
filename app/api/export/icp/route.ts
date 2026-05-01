import { getICPReport } from "@/features/tax/icp-actions";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { actionErrorStatus } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const quarter =
    Number(searchParams.get("quarter")) ||
    Math.ceil((new Date().getMonth() + 1) / 3);

  const result = await getICPReport(year, quarter);
  if (result.error)
    return NextResponse.json({ error: result.error }, { status: actionErrorStatus(result.error) });

  const data = result.data!;

  const headers = [
    "BTW-nummer afnemer",
    "Naam afnemer",
    "Totaalbedrag (EUR)",
    "Aantal facturen",
  ];

  const rows = data.entries.map((e) => [
    e.clientBtwNumber ?? "",
    e.clientName,
    String(e.totalAmount),
    String(e.invoiceCount),
  ]);

  // Add total row
  rows.push(["", "TOTAAL", String(data.totalAmount), ""]);

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `icp-opgave-Q${quarter}-${year}.csv`);
}
