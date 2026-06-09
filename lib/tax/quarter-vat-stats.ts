/**
 * Kwartaal-BTW-statistiek uit de canonieke rubriek-engine.
 *
 * De jaarrekening toonde BTW per kwartaal via een eigen, losse berekening (de
 * 4e divergentie uit de audit). Deze helper leidt dezelfde QuarterStats-vorm af
 * uit `calculateBtwRubrieken`, zodat jaarrekening en aangifte exact dezelfde
 * cijfers tonen — inclusief schema-routing (verlegd/export) en creditnota's.
 */

import {
  calculateBtwRubrieken,
  type InvoiceForBtw,
  type ReceiptForBtw,
} from "./btw-rubrieken";

const round2 = (v: number): number => Math.round(v * 100) / 100;

export interface QuarterVatStats {
  revenueExVat: number;
  outputVat: number;
  inputVat: number;
  netVat: number;
}

export function quarterVatStats(
  invoices: InvoiceForBtw[],
  receipts: ReceiptForBtw[],
): QuarterVatStats {
  const r = calculateBtwRubrieken(invoices, receipts);
  const revenueExVat = round2(
    r["1a"].omzet +
      r["1b"].omzet +
      r["1c"].omzet +
      r["1e"].omzet +
      r["2a"].omzet +
      r["3a"].omzet +
      r["3b"].omzet +
      r["4a"].omzet +
      r["4b"].omzet,
  );
  return {
    revenueExVat,
    outputVat: r.totaalBtw,
    inputVat: r.voorbelasting,
    netVat: r.rubriek5g,
  };
}
