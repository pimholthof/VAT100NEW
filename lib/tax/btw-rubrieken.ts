/**
 * Pure calculator for the Dutch VAT return (OB) rubrieken.
 *
 * Used by both the user-facing aangifte UI (features/tax/btw-aangifte.ts)
 * and the quarterly cron that prepares draft returns
 * (lib/use-cases/prepare-vat-returns.ts). Keeping the calculation in one
 * place prevents the two paths from drifting and producing different
 * numbers for the same period.
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
  "2a": BtwRubriekBucket;
  "3b": BtwRubriekBucket;
  "4a": BtwRubriekBucket;
  "4b": BtwRubriekBucket;
  voorbelasting: number;
  totaalBtw: number;
  rubriek5g: number;
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

function rateKey(rate: number): "1a" | "1b" | "1c" {
  if (rate === 21) return "1a";
  if (rate === 9) return "1b";
  return "1c";
}

function num(v: number | string | null | undefined): number {
  return Number(v) || 0;
}

export function calculateBtwRubrieken(
  invoices: InvoiceForBtw[],
  receipts: ReceiptForBtw[],
): BtwRubrieken {
  const r: Omit<BtwRubrieken, "voorbelasting" | "totaalBtw" | "rubriek5g"> = {
    "1a": { omzet: 0, btw: 0 },
    "1b": { omzet: 0, btw: 0 },
    "1c": { omzet: 0, btw: 0 },
    "2a": { omzet: 0, btw: 0 },
    "3b": { omzet: 0, btw: 0 },
    "4a": { omzet: 0, btw: 0 },
    "4b": { omzet: 0, btw: 0 },
  };

  for (const inv of invoices) {
    const sign = inv.is_credit_note ? -1 : 1;
    const scheme = inv.vat_scheme ?? "standard";

    if (scheme === "eu_reverse_charge") {
      const amount = num(inv.subtotal_ex_vat);
      r["3b"].omzet += sign * amount;
      r["2a"].omzet += sign * amount;
      continue;
    }

    if (scheme === "export_outside_eu") {
      r["4b"].omzet += sign * num(inv.subtotal_ex_vat);
      continue;
    }

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

  const voorbelasting = receipts.reduce((sum, rec) => {
    const pct = (rec.business_percentage ?? 100) / 100;
    return sum + num(rec.vat_amount) * pct;
  }, 0);

  const totaalBtw = round2(r["1a"].btw + r["1b"].btw + r["1c"].btw);
  const voorbelastingRounded = round2(voorbelasting);

  return {
    "1a": { omzet: round2(r["1a"].omzet), btw: round2(r["1a"].btw) },
    "1b": { omzet: round2(r["1b"].omzet), btw: round2(r["1b"].btw) },
    "1c": { omzet: round2(r["1c"].omzet), btw: round2(r["1c"].btw) },
    "2a": { omzet: round2(r["2a"].omzet), btw: round2(r["2a"].btw) },
    "3b": { omzet: round2(r["3b"].omzet), btw: round2(r["3b"].btw) },
    "4a": { omzet: round2(r["4a"].omzet), btw: round2(r["4a"].btw) },
    "4b": { omzet: round2(r["4b"].omzet), btw: round2(r["4b"].btw) },
    voorbelasting: voorbelastingRounded,
    totaalBtw,
    rubriek5g: round2(totaalBtw - voorbelastingRounded),
  };
}
