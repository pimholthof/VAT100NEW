/**
 * ECB FX-koersen helper.
 *
 * De Europese Centrale Bank publiceert dagelijks referentiekoersen
 * tegen de euro om 16:00 CET op https://www.ecb.europa.eu/stats/
 * eurofxref/eurofxref-daily.xml en historisch op
 * eurofxref-hist-90d.xml (laatste 90 werkdagen).
 *
 * De Belastingdienst accepteert de ECB-koers van de factuurdatum
 * voor omrekening naar EUR bij BTW- en IB-aangifte, mits je dezelfde
 * bron consequent gebruikt binnen één boekjaar.
 *
 * Dit module biedt:
 * - fetch + cache van de laatste 90 dagen koersen
 * - convertToEur(amount, currency, date) met nearest-working-day fallback
 *
 * Scaffold, nog niet in productie — integratie in invoice-flow volgt
 * in een vervolg-sprint.
 */

export type IsoCurrency =
  | "EUR"
  | "USD"
  | "GBP"
  | "CHF"
  | "SEK"
  | "NOK"
  | "DKK"
  | "CAD"
  | "AUD"
  | "JPY";

/**
 * Subset van ECB-reference-rates relevant voor NL creatieve ZZP'ers.
 * Uitbreiden op verzoek van een gebruiker die een exotische valuta factureert.
 */
export const SUPPORTED_CURRENCIES: IsoCurrency[] = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "CAD",
  "AUD",
  "JPY",
];

export interface RatesForDate {
  date: string; // YYYY-MM-DD
  rates: Partial<Record<IsoCurrency, number>>; // units of foreign currency per 1 EUR
}

const ECB_HIST_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";

/**
 * Parseert een ECB-XML payload naar een datum-gebaseerde map.
 * Voorbeeld van binnenkomende XML:
 *   <Cube time="2026-04-15">
 *     <Cube currency="USD" rate="1.0854"/>
 *     ...
 *   </Cube>
 */
export function parseEcbHistoricXml(xml: string): RatesForDate[] {
  const results: RatesForDate[] = [];
  const dayRegex = /<Cube\s+time="(\d{4}-\d{2}-\d{2})"\s*>([\s\S]*?)<\/Cube>/g;
  const rateRegex = /<Cube\s+currency="([A-Z]{3})"\s+rate="([\d.]+)"\s*\/>/g;

  let dayMatch: RegExpExecArray | null;
  while ((dayMatch = dayRegex.exec(xml)) !== null) {
    const date = dayMatch[1];
    const block = dayMatch[2];
    const rates: Partial<Record<IsoCurrency, number>> = { EUR: 1 };

    let rateMatch: RegExpExecArray | null;
    while ((rateMatch = rateRegex.exec(block)) !== null) {
      const code = rateMatch[1] as IsoCurrency;
      const rate = Number.parseFloat(rateMatch[2]);
      if (SUPPORTED_CURRENCIES.includes(code) && Number.isFinite(rate)) {
        rates[code] = rate;
      }
    }

    results.push({ date, rates });
  }

  return results;
}

/**
 * In-process cache. Op Vercel is dit per instance; good enough voor
 * de 90-daagse historische dataset die maar één keer per dag wijzigt.
 */
let _cache: { fetchedAt: number; data: RatesForDate[] } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 uur

export async function loadEcbRates(
  opts?: { fetchFn?: typeof fetch; force?: boolean }
): Promise<RatesForDate[]> {
  const now = Date.now();
  if (!opts?.force && _cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.data;
  }

  const fetcher = opts?.fetchFn ?? fetch;
  const res = await fetcher(ECB_HIST_URL, {
    headers: { Accept: "application/xml" },
  });
  if (!res.ok) {
    throw new Error(`ECB FX load failed: HTTP ${res.status}`);
  }
  const xml = await res.text();
  const data = parseEcbHistoricXml(xml);
  _cache = { fetchedAt: now, data };
  return data;
}

/**
 * Zoek de meest recente koers op of voor `date`. Als die specifieke
 * datum een weekend of feestdag was, valt de functie terug op de
 * laatste werkdag ervoor (ECB-conventie).
 */
export function findRateForDate(
  all: RatesForDate[],
  currency: IsoCurrency,
  date: string
): number | null {
  if (currency === "EUR") return 1;

  const sorted = [...all].sort((a, b) => (a.date < b.date ? -1 : 1));
  let bestRate: number | null = null;
  for (const row of sorted) {
    if (row.date > date) break;
    const rate = row.rates[currency];
    if (rate != null) bestRate = rate;
  }
  return bestRate;
}

export interface ConvertResult {
  amountEur: number;
  rate: number;
  rateDate: string;
  source: "ECB";
}

/**
 * Reken een bedrag om naar EUR voor een factuurdatum. Gebruik de koers
 * van die datum of de laatste werkdag ervoor. Retourneert `null` als
 * de valuta of datum buiten onze 90-daagse ECB-finestering valt — dan
 * moet de gebruiker handmatig een koers invullen.
 */
export async function convertToEur(
  amount: number,
  currency: IsoCurrency,
  date: string,
  opts?: { fetchFn?: typeof fetch }
): Promise<ConvertResult | null> {
  if (currency === "EUR") {
    return { amountEur: round2(amount), rate: 1, rateDate: date, source: "ECB" };
  }

  const rates = await loadEcbRates({ fetchFn: opts?.fetchFn });
  const rate = findRateForDate(rates, currency, date);
  if (rate == null || rate === 0) return null;

  // Vind de daadwerkelijke datum van de gebruikte koers
  const sorted = [...rates].sort((a, b) => (a.date < b.date ? -1 : 1));
  let rateDate = date;
  for (const row of sorted) {
    if (row.date > date) break;
    if (row.rates[currency] != null) rateDate = row.date;
  }

  return {
    amountEur: round2(amount / rate),
    rate,
    rateDate,
    source: "ECB",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
