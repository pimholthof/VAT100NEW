/**
 * Bon → aftrekbare kosten ex. BTW — de éne plek die bepaalt hoeveel een bon als
 * kosten meetelt voor de inkomstenbelasting.
 *
 * Veel bonnen worden ingevoerd of gescand met alleen het bedrag inclusief BTW
 * (de OCR vult dan `amount_inc_vat` + `vat_rate`, maar niet `amount_ex_vat`).
 * Telde je dan alleen `amount_ex_vat`, dan vielen die kosten weg → de winst en
 * dus de IB-reservering werden te hoog, en "vrij te besteden" te laag. Deze
 * helper leidt het ex-BTW-bedrag af zodra dat kan, met een veilige volgorde:
 *
 *  1. `amount_ex_vat` als die er is (> 0).
 *  2. incl − BTW-bedrag.
 *  3. incl / (1 + tarief).
 *  4. BTW-bedrag / tarief (als alleen die bekend zijn).
 *  5. incl als laatste redmiddel (geen tarief bekend → behandel als kosten).
 *
 * Puur en deterministisch, zodat dashboard, IB-projectie, reserve-snapshot en
 * jaarrekening exact dezelfde kosten zien.
 */

export interface ReceiptCostFields {
  amount_ex_vat: number | null;
  amount_inc_vat?: number | null;
  vat_amount?: number | null;
  vat_rate?: number | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function num(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Het aftrekbare bedrag ex. BTW van één bon, afgeleid uit de beste beschikbare
 * velden. Geeft 0 terug als er niets bruikbaars is.
 */
export function receiptCostExVat(receipt: ReceiptCostFields): number {
  const ex = num(receipt.amount_ex_vat);
  if (ex != null && ex > 0) return round2(ex);

  const inc = num(receipt.amount_inc_vat);
  const vatAmount = num(receipt.vat_amount);
  const rate = num(receipt.vat_rate);

  // 2. incl − BTW-bedrag (meest direct als beide bekend zijn).
  if (inc != null && inc > 0 && vatAmount != null && vatAmount >= 0 && vatAmount <= inc) {
    return round2(inc - vatAmount);
  }

  // 3. incl terugrekenen via het tarief.
  if (inc != null && inc > 0 && rate != null && rate >= 0) {
    return round2(inc / (1 + rate / 100));
  }

  // 4. Alleen BTW-bedrag + tarief bekend → ex = BTW / tarief.
  if (vatAmount != null && vatAmount > 0 && rate != null && rate > 0) {
    return round2(vatAmount / (rate / 100));
  }

  // 5. Alleen een inclusief bedrag, geen tarief → behandel het als de kosten.
  if (inc != null && inc > 0) return round2(inc);

  return 0;
}
