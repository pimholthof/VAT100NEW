/**
 * Adapter: canonieke BTW-rubrieken → de rij die de `vat_returns`-tabel verwacht.
 *
 * Eén bron van waarheid voor de aangifte. Zowel `generateVatReturn` als
 * `previewVatReturn` rekenen via {@link calculateBtwRubrieken} in plaats van
 * eigen, uiteenlopende logica — zo kunnen ze niet meer van elkaar (of van de
 * cron en de UI) afdrijven.
 *
 * ── SCHEMA-KANTTEKENING (bewust, gedocumenteerd) ─────────────────────────────
 * De `vat_returns`-tabel heeft (nog) géén kolommen voor rubriek 1e (0% / niet
 * bij u belast) en 3a (uitvoer buiten de EU). Om het *opgeslagen* gedrag exact
 * gelijk te houden aan vóór deze unificatie vouwen we:
 *   • 1e → 1c   (0%/onbelaste binnenlandse omzet; de btw is hier 0)
 *   • 3a → 4b   (uitvoer buiten EU; precies waar de oude code deze plaatste)
 * Dit is NIET fiscaal ideaal — op het officiële OB-formulier horen ze in 1e/3a.
 * De juiste oplossing is een migratie die `rubriek_1e_*` en `rubriek_3a_*`
 * toevoegt, plus het bijwerken van de PDF-/Digipoort-mapping, met akkoord van
 * een fiscalist. Tot dan: opgeslagen waarden identiek, berekening centraal.
 * Zie ARCHITECTURE.md → "Bekende divergenties".
 */

import {
  calculateBtwRubrieken,
  type BtwRubrieken,
  type InvoiceForBtw,
  type ReceiptForBtw,
} from "./btw-rubrieken";

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** De rubriek-kolommen zoals ze in de `vat_returns`-tabel staan. */
export interface VatReturnRubriekRow {
  rubriek_1a_omzet: number;
  rubriek_1a_btw: number;
  rubriek_1b_omzet: number;
  rubriek_1b_btw: number;
  rubriek_1c_omzet: number;
  rubriek_1c_btw: number;
  rubriek_2a_omzet: number;
  rubriek_2a_btw: number;
  rubriek_3b_omzet: number;
  rubriek_3b_btw: number;
  rubriek_4a_omzet: number;
  rubriek_4a_btw: number;
  rubriek_4b_omzet: number;
  rubriek_4b_btw: number;
  rubriek_5b: number;
}

/**
 * Mapt canonieke rubrieken op de (legacy) kolommen van `vat_returns`.
 * Vouwt 1e→1c en 3a→4b (zie schema-kanttekening bovenaan).
 */
export function rubriekenToVatReturnRow(r: BtwRubrieken): VatReturnRubriekRow {
  return {
    rubriek_1a_omzet: r["1a"].omzet,
    rubriek_1a_btw: r["1a"].btw,
    rubriek_1b_omzet: r["1b"].omzet,
    rubriek_1b_btw: r["1b"].btw,
    rubriek_1c_omzet: round2(r["1c"].omzet + r["1e"].omzet),
    rubriek_1c_btw: round2(r["1c"].btw + r["1e"].btw),
    rubriek_2a_omzet: r["2a"].omzet,
    rubriek_2a_btw: r["2a"].btw,
    rubriek_3b_omzet: r["3b"].omzet,
    rubriek_3b_btw: r["3b"].btw,
    rubriek_4a_omzet: r["4a"].omzet,
    rubriek_4a_btw: r["4a"].btw,
    rubriek_4b_omzet: round2(r["4b"].omzet + r["3a"].omzet),
    rubriek_4b_btw: round2(r["4b"].btw + r["3a"].btw),
    rubriek_5b: r.voorbelasting,
  };
}

export interface VatReturnComputation {
  rubrieken: BtwRubrieken;
  row: VatReturnRubriekRow;
  /** Rubriek 5a — totaal verschuldigde btw over álle rubrieken. */
  totaalBtw: number;
  /** Rubriek 5b — voorbelasting. */
  voorbelasting: number;
  /** 5a − 5b op centniveau (positief = te betalen, negatief = terug te vragen). */
  teBetalen: number;
}

/**
 * Bereken de volledige aangifte uit facturen + bonnen — de enige plek waar dat
 * voor de `vat_returns`-tabel gebeurt.
 */
export function computeVatReturnRow(
  invoices: InvoiceForBtw[],
  receipts: ReceiptForBtw[],
): VatReturnComputation {
  const rubrieken = calculateBtwRubrieken(invoices, receipts);
  return {
    rubrieken,
    row: rubriekenToVatReturnRow(rubrieken),
    totaalBtw: rubrieken.totaalBtw,
    voorbelasting: rubrieken.voorbelasting,
    teBetalen: rubrieken.rubriek5g,
  };
}
