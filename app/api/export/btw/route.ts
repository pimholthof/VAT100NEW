import { getBtwOverview } from "@/features/tax/actions";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getBtwOverview();
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  const headers = [
    "Kwartaal",
    "Omzet excl. BTW",
    "Af te dragen BTW",
    "Voorbelasting (te vorderen)",
    "Netto BTW",
    "Aantal facturen",
    "Aantal bonnen",
  ];

  const rows = (result.data ?? []).map((q) => [
    q.quarter,
    String(q.revenueExVat),
    String(q.outputVat),
    String(q.inputVat),
    String(q.netVat),
    String(q.invoiceCount),
    String(q.receiptCount),
  ]);

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `btw-overzicht-${new Date().toISOString().slice(0, 10)}.csv`);
}
