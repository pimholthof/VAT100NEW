import { requireAuth } from "@/lib/supabase/server";
import { getActivastaat } from "@/features/assets/actions";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error !== null) return NextResponse.json({ error: auth.error }, { status: 401 });

  const year = Number(request.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  const result = await getActivastaat(year);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  const data = result.data!;

  const headers = [
    "Omschrijving",
    "Categorie",
    "Aanschafdatum",
    "Aanschafprijs",
    "Afschrijving dit jaar",
    "Cumulatief afgeschreven",
    "Boekwaarde",
    "Resterende jaren",
  ];

  const rows = data.rijen.map((r) => [
    r.omschrijving,
    r.categorie ?? "",
    r.aanschafDatum,
    String(r.aanschafprijs),
    String(r.jaarAfschrijving),
    String(r.totaalAfgeschreven),
    String(r.boekwaarde),
    String(r.resterendeJaren),
  ]);

  // Totaalrij
  rows.push([
    "TOTAAL",
    "",
    "",
    String(data.totaalAanschafprijs),
    String(data.totaalAfschrijvingDitJaar),
    String(data.totaalCumulatief),
    String(data.totaalBoekwaarde),
    "",
  ]);

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `activastaat-${year}.csv`);
}
