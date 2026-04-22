/**
 * Nederlandse belastingberekeningen 2026
 *
 * Bronnen:
 * - Belastingdienst: Box 1 tarieven, heffingskortingen, KIA, afschrijving
 * - Rijksoverheid: Belastingplan 2026
 *
 * Alle bedragen in euro's. Alle tarieven als decimaal (0.3575 = 35,75%).
 */

// ─── Box 1: Inkomstenbelasting schijven 2026 ───

const BOX1_BRACKETS = [
  { min: 0, max: 38_883, rate: 0.3575 },
  { min: 38_883, max: 78_426, rate: 0.3756 },
  { min: 78_426, max: Infinity, rate: 0.495 },
] as const;

// ─── ZZP Ondernemersaftrek 2026 ───

const ZELFSTANDIGENAFTREK = 1_200; // urencriterium ≥ 1.225 uur/jaar
const MKB_VRIJSTELLING_RATE = 0.127; // 12,7% van (winst - ondernemersaftrek)

// ─── Algemene heffingskorting 2026 ───

const AHK_MAX = 3_115;
const AHK_AFBOUW_START = 29_739;
const AHK_AFBOUW_RATE = 0.06398; // €0 bij ≥ €78.426

// ─── Arbeidskorting 2026 (sleuteltabel: €996 / €5.325 / €5.712) ───

const AK_TRAJECT1_END = 11_691;
const AK_TRAJECT1_RATE = 0.08521; // → max €996
const AK_TRAJECT2_END = 25_224;
const AK_TRAJECT2_RATE = 0.31994; // → max €5.325
const AK_TRAJECT3_END = 45_593;
const AK_TRAJECT3_RATE = 0.019; // → max €5.712
const AK_AFBOUW_RATE = 0.0651; // €0 bij ≥ €132.920

// ─── KIA 2026 ───

const KIA_MIN_TOTAL = 2_901;
const KIA_TIER1_MAX = 71_683; // 28%
const KIA_TIER1_RATE = 0.28;
const KIA_TIER2_MAX = 132_746; // vast €20.072
const KIA_FIXED = 20_072;
const KIA_TIER3_MAX = 398_236; // €20.072 - 7,56% × (bedrag - €132.746)
const KIA_TIER3_RATE = 0.0756;
const KIA_ITEM_MIN = 450; // minimum per bedrijfsmiddel

// ─── Afschrijving ───

const AFSCHRIJVING_MAX_RATE = 0.2; // 20%/jaar (= min 5 jaar)
const DIRECT_AFTREK_DREMPEL = 450; // < €450 direct aftrekbaar
const DEFAULT_LEVENSDUUR = 5; // jaren

// ─── Types ───

export interface Investment {
  id: string;
  omschrijving: string;
  aanschafprijs: number; // ex BTW
  aanschafDatum: string; // ISO date
  levensduur: number; // jaren (default 5)
  restwaarde: number; // default 0
}

export interface Bespaartip {
  type: "kia" | "investering" | "timing" | "aftrek";
  titel: string;
  beschrijving: string;
  besparing: number;
}

export interface DepreciationRow {
  id: string;
  omschrijving: string;
  aanschafprijs: number;
  aanschafDatum: string;
  jaarAfschrijving: number;
  totaalAfgeschreven: number;
  boekwaarde: number;
  resterendeJaren: number;
}

export interface TaxProjection {
  // Winstberekening
  brutoOmzet: number;
  kosten: number;
  afschrijvingen: number;
  brutoWinst: number;

  // Aftrekposten
  zelfstandigenaftrek: number;
  mkbVrijstelling: number;
  kia: number;
  totalInvestments: number;

  // Belastbaar inkomen + IB
  belastbaarInkomen: number;
  inkomstenbelasting: number;
  algemeneHeffingskorting: number;
  arbeidskorting: number;
  nettoIB: number;
  effectiefTarief: number;

  // Prognose (geannualiseerd)
  prognoseJaarOmzet: number;
  prognoseJaarKosten: number;
  prognoseJaarIB: number;

  // Details
  afschrijvingDetails: DepreciationRow[];
  bespaartips: Bespaartip[];
}

// ─── Kernberekeningen ───

/**
 * Berekent de bruto Box 1-inkomstenbelasting over een belastbaar inkomen,
 * volgens het schijventarief 2026 (zonder heffingskortingen).
 *
 * @param belastbaarInkomen Belastbaar inkomen in euro's (≥ 0). Negatieve of
 *   nul-inkomens geven 0 terug.
 * @returns Bruto inkomstenbelasting in euro's, afgerond op 2 decimalen.
 *
 * @example
 * calculateBox1Tax(50_000) // ~16 087,53 (schijf 1 + deel schijf 2)
 */
export function calculateBox1Tax(belastbaarInkomen: number): number {
  if (belastbaarInkomen <= 0) return 0;
  let tax = 0;
  for (const bracket of BOX1_BRACKETS) {
    if (belastbaarInkomen <= bracket.min) break;
    const taxableInBracket = Math.min(belastbaarInkomen, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return round2(tax);
}

/**
 * Berekent de algemene heffingskorting 2026. Maximaal €3.115, afgebouwd met
 * 6,398% boven €29.739; nul bij verzamelinkomen ≥ €78.426.
 *
 * @param verzamelinkomen Verzamelinkomen (som van Box 1, 2, 3) in euro's.
 * @returns Heffingskorting in euro's, afgerond op 2 decimalen.
 */
export function calculateAlgemeneHeffingskorting(
  verzamelinkomen: number,
): number {
  if (verzamelinkomen <= AHK_AFBOUW_START) return AHK_MAX;
  const reduction = (verzamelinkomen - AHK_AFBOUW_START) * AHK_AFBOUW_RATE;
  return round2(Math.max(0, AHK_MAX - reduction));
}

/**
 * Berekent de arbeidskorting 2026 volgens de vier-trajectenformule:
 * opbouw (t/m €11.691), opbouw (t/m €25.224), opbouw (t/m €45.593),
 * afbouw 6,51% tot nul bij ≥ €132.920.
 *
 * @param arbeidsinkomen Inkomen uit arbeid/winst in euro's (≥ 0).
 * @returns Arbeidskorting in euro's, afgerond op 2 decimalen.
 */
export function calculateArbeidskorting(arbeidsinkomen: number): number {
  if (arbeidsinkomen <= 0) return 0;

  let ak = 0;

  if (arbeidsinkomen <= AK_TRAJECT1_END) {
    // Traject 1: opbouw
    ak = arbeidsinkomen * AK_TRAJECT1_RATE;
  } else if (arbeidsinkomen <= AK_TRAJECT2_END) {
    // Traject 2: opbouw
    ak =
      AK_TRAJECT1_END * AK_TRAJECT1_RATE +
      (arbeidsinkomen - AK_TRAJECT1_END) * AK_TRAJECT2_RATE;
  } else if (arbeidsinkomen <= AK_TRAJECT3_END) {
    // Traject 3: opbouw
    ak =
      AK_TRAJECT1_END * AK_TRAJECT1_RATE +
      (AK_TRAJECT2_END - AK_TRAJECT1_END) * AK_TRAJECT2_RATE +
      (arbeidsinkomen - AK_TRAJECT2_END) * AK_TRAJECT3_RATE;
  } else {
    // Afbouw
    const maxAK =
      AK_TRAJECT1_END * AK_TRAJECT1_RATE +
      (AK_TRAJECT2_END - AK_TRAJECT1_END) * AK_TRAJECT2_RATE +
      (AK_TRAJECT3_END - AK_TRAJECT2_END) * AK_TRAJECT3_RATE;
    ak = maxAK - (arbeidsinkomen - AK_TRAJECT3_END) * AK_AFBOUW_RATE;
  }

  return round2(Math.max(0, ak));
}

/**
 * Berekent de Kleinschaligheidsinvesteringsaftrek (KIA) 2026 over de
 * investeringstotaal van het jaar.
 *
 * - Onder €2.901 of boven €398.236: geen aftrek.
 * - €2.901 – €71.683: 28% van totaal.
 * - €71.684 – €132.746: vast €20.072.
 * - Boven €132.746: €20.072 – 7,56% × (bedrag – €132.746), niet onder nul.
 *
 * Let op: bedrijfsmiddelen onder €450 tellen niet mee in de som (check in
 * de aanroepende code), deze functie neemt de reeds gesommeerde waarde aan.
 *
 * @param totalInvestments Som van in aanmerking komende investeringen.
 * @returns KIA-aftrekbedrag in euro's.
 */
export function calculateKIA(totalInvestments: number): number {
  if (totalInvestments < KIA_MIN_TOTAL || totalInvestments > KIA_TIER3_MAX)
    return 0;

  if (totalInvestments <= KIA_TIER1_MAX) {
    return round2(totalInvestments * KIA_TIER1_RATE);
  }
  if (totalInvestments <= KIA_TIER2_MAX) {
    return KIA_FIXED;
  }
  // Tier 3: afbouw
  const reduction = (totalInvestments - KIA_TIER2_MAX) * KIA_TIER3_RATE;
  return round2(Math.max(0, KIA_FIXED - reduction));
}

// ─── Afschrijving ───

/**
 * Berekent de afschrijving over één kalenderjaar voor een bedrijfsmiddel,
 * rekening houdend met:
 * - Lineair over `levensduur` jaren (afschrijfbaar = aanschafprijs − restwaarde).
 * - Wettelijk maximum van 20% van de aanschafprijs per jaar.
 * - Pro-rata in het eerste jaar op basis van de aanschafmaand.
 *
 * @param aanschafprijs Bruto aanschafprijs in euro's.
 * @param restwaarde Geschatte restwaarde aan einde levensduur.
 * @param levensduur Verwachte economische levensduur in jaren (> 0).
 * @param aanschafDatum ISO-datum van aanschaf (YYYY-MM-DD).
 * @param huidigJaar Het jaar waarvoor de afschrijving wordt berekend.
 * @returns Eén regel met `jaar`, `afschrijving`, `boekwaarde` en een
 *   `isFullyDepreciated` flag die aangeeft of het bedrijfsmiddel volledig
 *   is afgeschreven.
 */
export function calculateYearlyDepreciation(
  aanschafprijs: number,
  restwaarde: number,
  levensduur: number,
  aanschafDatum: string,
  huidigJaar: number,
): DepreciationRow & { isFullyDepreciated: boolean } {
  const aanschafDate = new Date(aanschafDatum);
  const aanschafJaar = aanschafDate.getFullYear();
  const aanschafMaand = aanschafDate.getMonth(); // 0-based
  const jarenSindsAanschaf = huidigJaar - aanschafJaar;

  const afschrijfbaar = Math.max(0, aanschafprijs - restwaarde);
  const jaarAfschrijving = round2(afschrijfbaar / levensduur);

  // Check of max 20% regel niet overschreden wordt
  const maxAfschrijving = round2(aanschafprijs * AFSCHRIJVING_MAX_RATE);
  const effectieveJaarAfschrijving = Math.min(jaarAfschrijving, maxAfschrijving);

  // Eerste jaar: pro-rata naar maanden
  let huidigJaarAfschrijving = effectieveJaarAfschrijving;
  if (jarenSindsAanschaf === 0) {
    const maandenResterend = 12 - aanschafMaand;
    huidigJaarAfschrijving = round2(
      effectieveJaarAfschrijving * (maandenResterend / 12),
    );
  }

  // Totaal al afgeschreven (inclusief huidig jaar)
  let totaalAfgeschreven = 0;
  for (let jaar = aanschafJaar; jaar <= huidigJaar; jaar++) {
    if (jaar === aanschafJaar) {
      const maanden = 12 - aanschafMaand;
      totaalAfgeschreven += round2(
        effectieveJaarAfschrijving * (maanden / 12),
      );
    } else if (jaar < huidigJaar) {
      totaalAfgeschreven += effectieveJaarAfschrijving;
    } else {
      totaalAfgeschreven += huidigJaarAfschrijving;
    }
  }

  // Niet meer afschrijven dan het afschrijfbare bedrag
  totaalAfgeschreven = Math.min(totaalAfgeschreven, afschrijfbaar);
  if (jarenSindsAanschaf > 0) {
    // Herbereken huidig jaar als we al volledig afgeschreven zijn
    const vorigTotaal = totaalAfgeschreven - huidigJaarAfschrijving;
    huidigJaarAfschrijving = Math.min(
      huidigJaarAfschrijving,
      Math.max(0, afschrijfbaar - vorigTotaal),
    );
    totaalAfgeschreven = Math.min(vorigTotaal + huidigJaarAfschrijving, afschrijfbaar);
  }

  const boekwaarde = round2(aanschafprijs - totaalAfgeschreven);
  const resterendeJaren = Math.max(
    0,
    Math.ceil((boekwaarde - restwaarde) / Math.max(1, effectieveJaarAfschrijving)),
  );

  return {
    id: "",
    omschrijving: "",
    aanschafprijs,
    aanschafDatum,
    jaarAfschrijving: huidigJaarAfschrijving,
    totaalAfgeschreven,
    boekwaarde,
    resterendeJaren,
    isFullyDepreciated: boekwaarde <= restwaarde,
  };
}

// ─── Bespaartips ───

function generateBespaartips(
  totalInvestments: number,
  brutoWinst: number,
  belastbaarInkomen: number,
  maandenVerstreken: number,
  algemeneHeffingskorting: number,
  arbeidskorting: number,
): Bespaartip[] {
  const tips: Bespaartip[] = [];
  const maandenResterend = 12 - maandenVerstreken;

  // 1. KIA-drempel niet bereikt
  if (totalInvestments > 0 && totalInvestments < KIA_MIN_TOTAL) {
    const nodig = KIA_MIN_TOTAL - totalInvestments;
    const kiaBesparing = round2(KIA_MIN_TOTAL * KIA_TIER1_RATE * getMarginalRate(belastbaarInkomen));
    tips.push({
      type: "kia",
      titel: "KIA-drempel bijna bereikt",
      beschrijving: `Investeer nog ${formatEuro(nodig)} om ${formatEuro(kiaBesparing)} belasting te besparen via de KIA (28% aftrek).`,
      besparing: kiaBesparing,
    });
  }

  // 2. KIA-optimum: nog ruimte in eerste schijf (28%)
  if (totalInvestments >= KIA_MIN_TOTAL && totalInvestments < KIA_TIER1_MAX) {
    const ruimte = KIA_TIER1_MAX - totalInvestments;
    const extraBesparing = round2(
      Math.min(ruimte, 5000) * KIA_TIER1_RATE * getMarginalRate(belastbaarInkomen),
    );
    tips.push({
      type: "kia",
      titel: "Extra KIA-voordeel mogelijk",
      beschrijving: `Bij elke extra investering krijg je 28% KIA-aftrek. Nog ${formatEuro(ruimte)} ruimte in de eerste KIA-schijf.`,
      besparing: extraBesparing,
    });
  }

  // 3. Nog geen investeringen dit jaar
  if (totalInvestments === 0 && brutoWinst > 15000) {
    const voorbeeldInvestering = 3000;
    const besparing = round2(
      voorbeeldInvestering * KIA_TIER1_RATE * getMarginalRate(belastbaarInkomen),
    );
    tips.push({
      type: "investering",
      titel: "Overweeg een zakelijke investering",
      beschrijving: `Een investering van ${formatEuro(voorbeeldInvestering)} levert via de KIA ca. ${formatEuro(besparing)} belastingvoordeel op, bovenop de afschrijving.`,
      besparing,
    });
  }

  // 4. Einde boekjaar nadert
  if (maandenResterend <= 3 && maandenResterend > 0) {
    tips.push({
      type: "timing",
      titel: `Nog ${maandenResterend} maand${maandenResterend > 1 ? "en" : ""} tot einde boekjaar`,
      beschrijving:
        "Investeringen en aftrekbare kosten moeten vóór 31 december gedaan worden om dit jaar mee te tellen.",
      besparing: 0,
    });
  }

  // 5. Heffingskortingen tonen
  const totalKortingen = round2(algemeneHeffingskorting + arbeidskorting);
  if (totalKortingen > 0) {
    tips.push({
      type: "aftrek",
      titel: "Heffingskortingen besparen je flink",
      beschrijving: `Je ontvangt ${formatEuro(totalKortingen)} aan heffingskortingen (AHK ${formatEuro(algemeneHeffingskorting)} + arbeidskorting ${formatEuro(arbeidskorting)}).`,
      besparing: totalKortingen,
    });
  }

  return tips;
}

// ─── Hoofdfunctie ───

/**
 * Volledige jaarlijkse belastingprognose voor een ZZP'er op basis van
 * year-to-date data. Past zelfstandigenaftrek, MKB-vrijstelling, KIA,
 * afschrijvingen, Box 1 schijven, AHK en arbeidskorting toe.
 *
 * Alle componenten zijn doorberekend volgens 2026-tarieven (`TAX_CONSTANTS`).
 *
 * @param input.jaarOmzetExBtw Totale omzet tot nu toe (ex. BTW).
 * @param input.jaarKostenExBtw Totale aftrekbare kosten tot nu toe (ex. BTW).
 * @param input.investeringen Lopende investeringen voor KIA- en
 *   afschrijvingsberekening.
 * @param input.maandenVerstreken Aantal maanden van het boekjaar dat al is
 *   verstreken (1-12). Gebruikt voor lineaire extrapolatie.
 * @param input.huidigJaar Optioneel kalenderjaar; default = huidig jaar.
 * @returns Volledige {@link TaxProjection} inclusief bespaartips.
 */
export function calculateZZPTaxProjection(input: {
  jaarOmzetExBtw: number;
  jaarKostenExBtw: number;
  investeringen: Investment[];
  maandenVerstreken: number;
  huidigJaar?: number;
  kilometerAftrek?: number; // €0,23/km deduction from trips
}): TaxProjection {
  const { jaarOmzetExBtw, jaarKostenExBtw, investeringen, maandenVerstreken } =
    input;
  const huidigJaar = input.huidigJaar ?? new Date().getFullYear();

  // Afschrijvingen berekenen
  const afschrijvingDetails: DepreciationRow[] = [];
  let totalAfschrijvingen = 0;

  for (const inv of investeringen) {
    if (inv.aanschafprijs < DIRECT_AFTREK_DREMPEL) continue; // < €450 al direct in kosten

    const dep = calculateYearlyDepreciation(
      inv.aanschafprijs,
      inv.restwaarde,
      inv.levensduur || DEFAULT_LEVENSDUUR,
      inv.aanschafDatum,
      huidigJaar,
    );

    afschrijvingDetails.push({
      ...dep,
      id: inv.id,
      omschrijving: inv.omschrijving,
    });

    totalAfschrijvingen += dep.jaarAfschrijving;
  }

  totalAfschrijvingen = round2(totalAfschrijvingen);

  // KIA: alleen investeringen ≥ €450 van dit jaar tellen
  const kiaInvesteringen = investeringen.filter(
    (inv) =>
      inv.aanschafprijs >= KIA_ITEM_MIN &&
      new Date(inv.aanschafDatum).getFullYear() === huidigJaar,
  );
  const totalInvestments = kiaInvesteringen.reduce(
    (sum, inv) => sum + inv.aanschafprijs,
    0,
  );

  // Kilometervergoeding aftrek
  const kilometerAftrek = input.kilometerAftrek ?? 0;

  // Winstberekening
  const brutoWinst = round2(
    Math.max(0, jaarOmzetExBtw - jaarKostenExBtw - totalAfschrijvingen - kilometerAftrek),
  );

  // Aftrekposten
  const zelfstandigenaftrek = Math.min(ZELFSTANDIGENAFTREK, brutoWinst);
  const winstNaAftrek = Math.max(0, brutoWinst - zelfstandigenaftrek);
  const mkbVrijstelling = round2(winstNaAftrek * MKB_VRIJSTELLING_RATE);
  const kia = calculateKIA(totalInvestments);

  // Belastbaar inkomen
  const belastbaarInkomen = round2(
    Math.max(0, winstNaAftrek - mkbVrijstelling - kia),
  );

  // Inkomstenbelasting
  const inkomstenbelasting = calculateBox1Tax(belastbaarInkomen);
  const algemeneHeffingskorting =
    calculateAlgemeneHeffingskorting(belastbaarInkomen);
  const arbeidskorting = calculateArbeidskorting(belastbaarInkomen);

  const nettoIB = round2(
    Math.max(0, inkomstenbelasting - algemeneHeffingskorting - arbeidskorting),
  );

  const effectiefTarief =
    jaarOmzetExBtw > 0 ? round2((nettoIB / jaarOmzetExBtw) * 100) : 0;

  // Prognose (annualisering)
  const factor =
    maandenVerstreken > 0 ? 12 / maandenVerstreken : 1;
  const prognoseJaarOmzet = round2(jaarOmzetExBtw * factor);
  const prognoseJaarKosten = round2(jaarKostenExBtw * factor);

  // Prognose IB berekenen met geannualiseerde cijfers
  const prognoseKmAftrek = round2(kilometerAftrek * factor);
  const prognoseWinst = Math.max(
    0,
    prognoseJaarOmzet - prognoseJaarKosten - totalAfschrijvingen - prognoseKmAftrek,
  );
  const prognoseZA = Math.min(ZELFSTANDIGENAFTREK, prognoseWinst);
  const prognoseNaAftrek = Math.max(0, prognoseWinst - prognoseZA);
  const prognoseMKB = round2(prognoseNaAftrek * MKB_VRIJSTELLING_RATE);
  const prognoseKIA = calculateKIA(totalInvestments); // KIA is niet geannualiseerd
  const prognoseBelastbaar = round2(
    Math.max(0, prognoseNaAftrek - prognoseMKB - prognoseKIA),
  );
  const prognoseIB = calculateBox1Tax(prognoseBelastbaar);
  const prognoseAHK = calculateAlgemeneHeffingskorting(prognoseBelastbaar);
  const prognoseAK = calculateArbeidskorting(prognoseBelastbaar);
  const prognoseJaarIB = round2(
    Math.max(0, prognoseIB - prognoseAHK - prognoseAK),
  );

  // Bespaartips
  const bespaartips = generateBespaartips(
    totalInvestments,
    brutoWinst,
    belastbaarInkomen,
    maandenVerstreken,
    algemeneHeffingskorting,
    arbeidskorting,
  );

  return {
    brutoOmzet: jaarOmzetExBtw,
    kosten: jaarKostenExBtw,
    afschrijvingen: totalAfschrijvingen,
    brutoWinst,
    zelfstandigenaftrek,
    mkbVrijstelling,
    kia,
    totalInvestments,
    belastbaarInkomen,
    inkomstenbelasting,
    algemeneHeffingskorting,
    arbeidskorting,
    nettoIB,
    effectiefTarief,
    prognoseJaarOmzet,
    prognoseJaarKosten,
    prognoseJaarIB,
    afschrijvingDetails,
    bespaartips,
  };
}

// ─── Exported constanten (voor UI) ───

export const TAX_CONSTANTS = {
  year: 2026,
  zelfstandigenaftrek: ZELFSTANDIGENAFTREK,
  mkbVrijstellingRate: MKB_VRIJSTELLING_RATE,
  ahkMax: AHK_MAX,
  akMax: 5_712,
  kiaMinTotal: KIA_MIN_TOTAL,
  kiaItemMin: KIA_ITEM_MIN,
  kiaTier1Rate: KIA_TIER1_RATE,
  directAftrekDrempel: DIRECT_AFTREK_DREMPEL,
  defaultLevensduur: DEFAULT_LEVENSDUUR,
  box1Brackets: BOX1_BRACKETS,
} as const;

// ─── Helpers ───

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Geeft het marginale tarief (de rate van de hoogste schijf waarin
 * `belastbaarInkomen` valt) terug. Gebruikt voor bespaartip-berekeningen:
 * "hoeveel zou €X extra aftrek opleveren?".
 *
 * @param belastbaarInkomen Belastbaar inkomen in euro's.
 * @returns Marginaal tarief als decimaal (0,3575 / 0,3756 / 0,495).
 */
export function getMarginalRate(belastbaarInkomen: number): number {
  if (belastbaarInkomen <= 0) return BOX1_BRACKETS[0].rate;
  for (let i = BOX1_BRACKETS.length - 1; i >= 0; i--) {
    if (belastbaarInkomen > BOX1_BRACKETS[i].min) return BOX1_BRACKETS[i].rate;
  }
  return BOX1_BRACKETS[0].rate;
}

function formatEuro(amount: number): string {
  return `€${Math.round(amount).toLocaleString("nl-NL")}`;
}
