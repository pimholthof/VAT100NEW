import { generateBtwAangifte } from "@/features/tax/btw-aangifte";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const quarter = Number(searchParams.get("quarter")) || Math.ceil((new Date().getMonth() + 1) / 3);

  const result = await generateBtwAangifte(year, quarter);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  const data = result.data!;

  const headers = [
    "Rubriek",
    "Omschrijving",
    "Omzet",
    "BTW",
  ];

  const rows = [
    ["1a", "Leveringen/diensten belast met hoog tarief (21%)", String(data.rubriek1a.omzet), String(data.rubriek1a.btw)],
    ["1b", "Leveringen/diensten belast met laag tarief (9%)", String(data.rubriek1b.omzet), String(data.rubriek1b.btw)],
    ["1c", "Leveringen/diensten belast met overige tarieven (0%)", String(data.rubriek1c.omzet), String(data.rubriek1c.btw)],
    ["", "", "", ""],
    ["5b", "Voorbelasting", "", String(data.rubriek5b)],
    ["", "", "", ""],
    ["", "Totaal verschuldigde BTW", "", String(data.totaalBtw)],
    ["", "Totaal voorbelasting", "", String(data.voorbelasting)],
    ["5g", "Te betalen / terug te ontvangen", "", String(data.rubriek5g)],
  ];

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `btw-aangifte-Q${quarter}-${year}.csv`);
}
