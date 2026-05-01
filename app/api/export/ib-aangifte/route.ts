import { generateIBAangifteData } from "@/features/tax/ib-aangifte";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { actionErrorStatus } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year")) || new Date().getFullYear() - 1;

  const result = await generateIBAangifteData(year);
  if (result.error) return NextResponse.json({ error: result.error }, { status: actionErrorStatus(result.error) });

  const data = result.data!;

  const headers = ["Veld", "Waarde"];

  const rows = [
    ["Jaar", String(data.jaar)],
    ["Naam", data.naam],
    ["BTW-nummer", data.btwNummer ?? ""],
    ["KVK-nummer", data.kvkNummer ?? ""],
    ["", ""],
    ["─── WINST UIT ONDERNEMING ───", ""],
    ["Omzet (excl. BTW)", String(data.omzet)],
    ["Kosten", String(data.kosten)],
    ["Afschrijvingen", String(data.afschrijvingen)],
    ["Brutowinst", String(data.brutoWinst)],
    ["", ""],
    ["─── ONDERNEMERSAFTREK ───", ""],
    ["Zelfstandigenaftrek", String(data.zelfstandigenaftrek)],
    ["MKB-winstvrijstelling", String(data.mkbVrijstelling)],
    ["Kleinschaligheidsinvesteringsaftrek (KIA)", String(data.kia)],
    ["Totaal investeringen", String(data.totaalInvesteringen)],
    ["", ""],
    ["─── BELASTBAAR INKOMEN ───", ""],
    ["Belastbaar inkomen Box 1", String(data.belastbaarInkomen)],
    ["", ""],
    ["─── BEREKENDE BELASTING ───", ""],
    ["Inkomstenbelasting", String(data.inkomstenbelasting)],
    ["Algemene heffingskorting", String(data.algemeneHeffingskorting)],
    ["Arbeidskorting", String(data.arbeidskorting)],
    ["Netto IB (te betalen)", String(data.nettoIB)],
    ["Effectief tarief", `${data.effectiefTarief}%`],
    ["", ""],
    ["─── BALANS ───", ""],
    ["Vaste activa", String(data.vasteActiva)],
    ["Banksaldo", String(data.bankSaldo)],
    ["Debiteuren", String(data.debiteuren)],
    ["Eigen vermogen", String(data.eigenVermogen)],
  ];

  // Investeringsdetails
  if (data.investeringen.length > 0) {
    rows.push(["", ""]);
    rows.push(["─── INVESTERINGEN ───", ""]);
    for (const inv of data.investeringen) {
      rows.push([inv.omschrijving, `Aanschaf: ${inv.aanschafprijs} | Boekwaarde: ${inv.boekwaarde} | Afschr: ${inv.jaarAfschrijving}`]);
    }
  }

  // Kostenspecificatie
  if (data.kostenGroepen.length > 0) {
    rows.push(["", ""]);
    rows.push(["─── KOSTENSPECIFICATIE ───", ""]);
    for (const g of data.kostenGroepen) {
      rows.push([g.groep, String(g.subtotaal)]);
    }
  }

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `ib-aangifte-${year}.csv`);
}
