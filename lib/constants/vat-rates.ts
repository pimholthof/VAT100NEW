export const COMMON_VAT_RATES = [
  { rate: 21, label: "21% (NL standaard)", country: "NL" },
  { rate: 9, label: "9% (NL laag)", country: "NL" },
  { rate: 0, label: "0% (vrijgesteld)", country: null },
  { rate: 19, label: "19% (DE standaard)", country: "DE" },
  { rate: 7, label: "7% (DE laag)", country: "DE" },
  { rate: 20, label: "20% (FR/UK standaard)", country: "FR" },
  { rate: 5, label: "5% (UK laag)", country: "UK" },
  { rate: 6, label: "6% (BE laag)", country: "BE" },
  { rate: 25, label: "25% (SE/DK standaard)", country: "SE" },
  { rate: 12, label: "12% (SE laag)", country: "SE" },
  { rate: 10, label: "10% (AT/IT laag)", country: "AT" },
  { rate: 22, label: "22% (IT standaard)", country: "IT" },
  { rate: 23, label: "23% (PT/IE standaard)", country: "PT" },
] as const;

export type VatRateOption = (typeof COMMON_VAT_RATES)[number];

export const COMMON_CURRENCIES = [
  { code: "EUR", label: "EUR — Euro", symbol: "\u20ac" },
  { code: "USD", label: "USD — Dollar", symbol: "$" },
  { code: "GBP", label: "GBP — Pond", symbol: "\u00a3" },
  { code: "CHF", label: "CHF — Frank", symbol: "CHF" },
  { code: "SEK", label: "SEK — Zweedse kroon", symbol: "kr" },
  { code: "DKK", label: "DKK — Deense kroon", symbol: "kr" },
  { code: "NOK", label: "NOK — Noorse kroon", symbol: "kr" },
  { code: "PLN", label: "PLN — Zloty", symbol: "z\u0142" },
  { code: "CZK", label: "CZK — Tsjechische kroon", symbol: "K\u010d" },
] as const;

export function getVatRatesByCountry(): { country: string | null; rates: VatRateOption[] }[] {
  const grouped = new Map<string | null, VatRateOption[]>();
  for (const rate of COMMON_VAT_RATES) {
    const key = rate.country;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rate);
  }
  return Array.from(grouped.entries()).map(([country, rates]) => ({ country, rates }));
}
