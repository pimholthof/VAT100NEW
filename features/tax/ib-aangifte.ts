"use server";

import { getJaarrekeningData } from "./jaarrekening";
import type { ActionResult } from "@/lib/types";

// ─── IB Aangifte data (gemapt op officieel formulier) ───

export interface IBAangifteData {
  jaar: number;
  isVoorlopig: boolean;

  // Profiel
  naam: string;
  btwNummer: string | null;
  kvkNummer: string | null;

  // Winst uit onderneming
  omzet: number;
  kosten: number;
  afschrijvingen: number;
  brutoWinst: number;

  // Ondernemersaftrek
  zelfstandigenaftrek: number;
  mkbVrijstelling: number;
  kia: number;
  totaalInvesteringen: number;

  // Belastbaar inkomen
  belastbaarInkomen: number;

  // Berekende belasting
  inkomstenbelasting: number;
  algemeneHeffingskorting: number;
  arbeidskorting: number;
  nettoIB: number;
  effectiefTarief: number;

  // Balans (vereenvoudigd)
  vasteActiva: number;
  bankSaldo: number;
  debiteuren: number;
  eigenVermogen: number;

  // Afschrijvingsdetails
  investeringen: Array<{
    omschrijving: string;
    aanschafprijs: number;
    boekwaarde: number;
    jaarAfschrijving: number;
  }>;

  // Kostenspecificatie
  kostenGroepen: Array<{
    groep: string;
    subtotaal: number;
  }>;
}

export async function generateIBAangifteData(
  year: number,
): Promise<ActionResult<IBAangifteData>> {
  const result = await getJaarrekeningData(year);
  if (result.error) return { error: result.error };
  const jr = result.data!;

  return {
    error: null,
    data: {
      jaar: jr.jaar,
      isVoorlopig: jr.isVoorlopig,

      naam: jr.profiel.fullName,
      btwNummer: jr.profiel.btwNumber,
      kvkNummer: jr.profiel.kvkNumber,

      omzet: jr.winstEnVerlies.nettoOmzet,
      kosten: jr.winstEnVerlies.totaalKosten,
      afschrijvingen: jr.winstEnVerlies.afschrijvingen,
      brutoWinst: jr.winstEnVerlies.brutoWinst,

      zelfstandigenaftrek: jr.fiscaal.zelfstandigenaftrek,
      mkbVrijstelling: jr.fiscaal.mkbVrijstelling,
      kia: jr.fiscaal.kia,
      totaalInvesteringen: jr.fiscaal.totalInvestments,

      belastbaarInkomen: jr.fiscaal.belastbaarInkomen,

      inkomstenbelasting: jr.fiscaal.inkomstenbelasting,
      algemeneHeffingskorting: jr.fiscaal.algemeneHeffingskorting,
      arbeidskorting: jr.fiscaal.arbeidskorting,
      nettoIB: jr.fiscaal.nettoIB,
      effectiefTarief: jr.fiscaal.effectiefTarief,

      vasteActiva: jr.balans.vasteActiva,
      bankSaldo: jr.balans.bankSaldo,
      debiteuren: jr.balans.debiteuren,
      eigenVermogen: jr.balans.eigenVermogen,

      investeringen: jr.investeringen.map((inv) => ({
        omschrijving: inv.omschrijving,
        aanschafprijs: inv.aanschafprijs,
        boekwaarde: inv.boekwaarde,
        jaarAfschrijving: inv.jaarAfschrijving,
      })),

      kostenGroepen: jr.winstEnVerlies.kostenGroepen.map((g) => ({
        groep: g.groep,
        subtotaal: g.subtotaal,
      })),
    },
  };
}
