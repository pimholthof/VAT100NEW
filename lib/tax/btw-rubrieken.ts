/**
 * Pure calculator for the Dutch VAT return (OB) rubrieken.
 *
 * Used by both the user-facing aangifte UI (features/tax/btw-aangifte.ts)
 * and the quarterly cron that prepares draft returns
 * (lib/use-cases/prepare-vat-returns.ts). Keeping the calculation in one
 * place prevents the two paths from drifting and producing different
 * numbers for the same period.
 *
 * De rubriek-indeling volgt het officiële Belastingdienst OB-formulier:
 *   1a  Leveringen/diensten belast met hoog tarief (21%)
 *   1b  Leveringen/diensten belast met laag tarief (9%)
 *   1c  Leveringen/diensten belast met overige tarieven (niet 0%)
 *   1e  Leveringen/diensten belast met 0% of niet bij u belast
 *   2a  Leveringen/diensten waarbij de btw naar u is verlegd (binnenland)
 *   3a  Leveringen naar landen buiten de EU (uitvoer)
 *   3b  Leveringen naar / diensten in landen binnen de EU (ICP)
 *   4a  Leveringen/diensten uit landen buiten de EU
 *   4b  Leveringen/diensten uit landen binnen de EU
 *   5a  Verschuldigde omzetbelasting (som van rubriek 1 t/m 4)
 *   5b  Voorbelasting
 *  (5a − 5b) = te betalen (+) of terug te vragen (−)
 *
 * Let op: de Belastingdienst rondt elke rubriek af op hele euro's. Deze
 * calculator rekent intern op centniveau (voor controleerbaarheid); gebruik
 * `rubriek5gAfgerond` voor het bedrag dat daadwerkelijk in de aangifte hoort.
 *
 * Uitbreidpunten: rubrieken 2a / 4a / 4b worden nog niet gevuld omdat de app
 * (nog) geen inkoop-met-verlegging of buitenlandse verwerving kent. Zodra die
 * schema's bestaan, telt `totaalBtw` hun verschuldigde btw automatisch mee.
 */

const round2 = (v: number): number => Math.round(v * 100) / 100;

export interface BtwRubriekBucket {
  omzet: number;
  btw: number;
}

export interface BtwRubrieken {
  "1a": BtwRubriekBucket;
  "1b": BtwRubriekBucket;
  "1c": BtwRubriekBucket;
  "1e": BtwRubriekBucket;
  "2a": BtwRubriekBucket;
  "3a": BtwRubriekBucket;
  "3b": BtwRubriekBucket;
  "4a": BtwRubriekBucket;
  "4b": BtwRubriekBucket;
  /** Rubriek 5b — voorbelasting. */
  voorbelasting: number;
  /** Rubriek 5a — totaal verschuldigde btw (som van alle btw in 1 t/m 4). */
  totaalBtw: number;
  /** 5a − 5b op centniveau (positief = te betalen). */
  rubriek5g: number;
  /** 5a − 5b afgerond op hele euro's, zoals de aangifte vereist. */
  rubriek5gAfgerond: number;
}

export interface InvoiceForBtw {
  subtotal_ex_vat: number | string | null;
  vat_amount: number | string | null;
  vat_rate: number | null;
  vat_scheme?: string | null;
  is_credit_note?: boolean | null;
  invoice_lines?: Array<{
    amount: number | string | null;
    vat_rate: number | null;
  }> | null;
}

export interface ReceiptForBtw {
  vat_amount: number | string | null;
  business_percentage?: number | null;
}

type StandardRateKey = "1a" | "1b" | "1c" | "1e";

/** Routeer een binnenlandse prestatie naar de juiste tarief-rubriek. */
function rateKey(rate: number): StandardRateKey {
  if (rate === 21) return "1a";
  if (rate === 9) return "1b";
  if (rate === 0) return "1e"; // 0% / niet bij u belast — nooit 1c
  return "1c"; // overige tarieven (bijv. historisch 6%)
}

function num(v: number | string | null | undefined): number {
  return Number(v) || 0;
}

function emptyBucket(): BtwRubriekBucket {
  return { omzet: 0, btw: 0 };
}

export function calculateBtwRubrieken(
  invoices: InvoiceForBtw[],
  receipts: ReceiptForBtw[],
): BtwRubrieken {
  const r: Record<
    "1a" | "1b" | "1c" | "1e" | "2a" | "3a" | "3b" | "4a" | "4b",
    BtwRubriekBucket
  > = {
    "1a": emptyBucket(),
    "1b": emptyBucket(),
    "1c": emptyBucket(),
    "1e": emptyBucket(),
    "2a": emptyBucket(),
    "3a": emptyBucket(),
    "3b": emptyBucket(),
    "4a": emptyBucket(),
    "4b": emptyBucket(),
  };

  for (const inv of invoices) {
    const sign = inv.is_credit_note ? -1 : 1;
    const scheme = inv.vat_scheme ?? "standard";

    // Intracommunautaire levering/dienst (btw verlegd naar EU-afnemer) → 3b.
    // De afnemer draagt de btw af; bij ons enkel omzet, geen verschuldigde btw.
    if (scheme === "eu_reverse_charge") {
      r["3b"].omzet += sign * num(inv.subtotal_ex_vat);
      continue;
    }

    // Uitvoer naar landen buiten de EU → 3a (0% in NL, geen btw).
    if (scheme === "export_outside_eu") {
      r["3a"].omzet += sign * num(inv.subtotal_ex_vat);
      continue;
    }

    // Binnenlandse prestatie: per regel op tarief, anders factuurtotaal.
    const lines = inv.invoice_lines ?? [];
    if (lines.length > 0) {
      for (const line of lines) {
        const rate = line.vat_rate ?? inv.vat_rate ?? 21;
        const amount = num(line.amount);
        const key = rateKey(rate);
        r[key].omzet += sign * amount;
        r[key].btw += sign * round2(amount * (rate / 100));
      }
    } else {
      const rate = inv.vat_rate ?? 21;
      const key = rateKey(rate);
      r[key].omzet += sign * num(inv.subtotal_ex_vat);
      r[key].btw += sign * num(inv.vat_amount);
    }
  }

  // Voorbelasting (5b): btw op zakelijke kosten, gewogen met zakelijk %.
  const voorbelasting = receipts.reduce((sum, rec) => {
    const pct = (rec.business_percentage ?? 100) / 100;
    return sum + num(rec.vat_amount) * pct;
  }, 0);
  const voorbelastingRounded = round2(voorbelasting);

  // Rubriek 5a: totaal verschuldigde btw over álle rubrieken (toekomstvast).
  const totaalBtw = round2(
    r["1a"].btw +
      r["1b"].btw +
      r["1c"].btw +
      r["1e"].btw +
      r["2a"].btw +
      r["3a"].btw +
      r["3b"].btw +
      r["4a"].btw +
      r["4b"].btw,
  );

  const rubriek5g = round2(totaalBtw - voorbelastingRounded);
  // Aangifte op hele euro's: rond 5a en 5b elk af, dan het saldo.
  const rubriek5gAfgerond = Math.round(totaalBtw) - Math.round(voorbelastingRounded);

  const roundBucket = (b: BtwRubriekBucket): BtwRubriekBucket => ({
    omzet: round2(b.omzet),
    btw: round2(b.btw),
  });

  return {
    "1a": roundBucket(r["1a"]),
    "1b": roundBucket(r["1b"]),
    "1c": roundBucket(r["1c"]),
    "1e": roundBucket(r["1e"]),
    "2a": roundBucket(r["2a"]),
    "3a": roundBucket(r["3a"]),
    "3b": roundBucket(r["3b"]),
    "4a": roundBucket(r["4a"]),
    "4b": roundBucket(r["4b"]),
    voorbelasting: voorbelastingRounded,
    totaalBtw,
    rubriek5g,
    rubriek5gAfgerond,
  };
}
