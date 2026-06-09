/**
 * Fiscale waarheid — de gedeelde rekenkern achter VAT100's twee kernen.
 *
 * Eén factuur verandert direct je fiscale werkelijkheid. Deze module vertaalt
 * een factuurbedrag naar de enige vraag die telt: "Wat is hiervan écht van mij?"
 *
 * De factuur wordt ontleed in drie delen:
 *  1. BTW        — nooit van jou; je bewaart het voor de Belastingdienst.
 *  2. IB-reservering — wat je opzij zet voor de inkomstenbelasting.
 *  3. Van jou    — wat er na BTW en IB-reservering overblijft.
 *
 * Bewust puur (geen server- of React-imports) zodat dezelfde berekening zowel
 * op de server (Server Actions) als live in de client (terwijl je typt) draait
 * en overal exact hetzelfde getal toont.
 *
 * De IB-reservering is een *marginale* schatting: hoeveel inkomstenbelasting
 * komt er bij als deze factuur boven op je geschatte jaarinkomen komt. Dat is
 * precies de juiste vraag voor "hoeveel moet ik van deze factuur reserveren?".
 * We hergebruiken hiervoor de geverifieerde 2026-motor (`calculateZZPTaxProjection`),
 * zodat het waarheid-paneel en het dashboard nooit van elkaar verschillen.
 */

import type { VatRate } from "@/lib/types";
import {
  calculateInvoiceVatAmount,
  roundMoney,
} from "@/lib/logic/invoice-calculations";
import { calculateZZPTaxProjection } from "@/lib/tax/dutch-tax-2026";

/**
 * Aanname voor het jaarinkomen wanneer de gebruiker dit (nog) niet heeft
 * ingevuld. Geeft een realistisch marginaal tarief zodat het paneel altijd
 * een betekenisvol "van jou" toont; de schatting wordt persoonlijk zodra
 * {@link FiscalProfileInput.estimatedAnnualIncome} bekend is.
 */
export const DEFAULT_ASSUMED_ANNUAL_REVENUE = 40_000;

export interface FiscalProfileInput {
  /** Geschat jaarinkomen (omzet ex. BTW) uit het profiel. */
  estimatedAnnualIncome: number | null;
  /** Voldoet aan het urencriterium (≥ 1.225 uur) — voor toekomstig gebruik. */
  meetsUrencriterium?: boolean;
  /** Gebruikt de kleineondernemersregeling (KOR) — dan geen BTW-afdracht. */
  usesKor?: boolean;
}

export interface InvoiceTruth {
  /** Wat de klant betaalt (incl. BTW). */
  clientPays: number;
  /** Netto factuurbedrag (ex. BTW) — de omzet die telt voor de IB. */
  net: number;
  /** BTW die je voor de Belastingdienst bewaart. */
  btw: number;
  /** Het gehanteerde BTW-tarief. */
  vatRate: VatRate;
  /** Wat je opzij zet voor de inkomstenbelasting (marginale schatting). */
  incomeTaxReserve: number;
  /** Wat er werkelijk van jou is: netto − IB-reservering. */
  yours: number;
  /** Het gehanteerde marginale IB-tarief (decimaal, bijv. 0,35). */
  marginalRate: number;
  /** True als de schatting op het echte geschatte jaarinkomen is gebaseerd. */
  personalised: boolean;
}

/**
 * Netto inkomstenbelasting (na heffingskortingen) bij een gegeven jaaromzet,
 * volgens de 2026-tarieven. `maandenVerstreken: 12` schakelt de annualisering
 * uit zodat we de IB over precies dit omzetniveau krijgen.
 */
function nettoIBAtRevenue(annualRevenueExBtw: number): number {
  if (annualRevenueExBtw <= 0) return 0;
  return calculateZZPTaxProjection({
    jaarOmzetExBtw: annualRevenueExBtw,
    jaarKostenExBtw: 0,
    investeringen: [],
    maandenVerstreken: 12,
  }).nettoIB;
}

/**
 * Marginale inkomstenbelasting over een extra netto-omzet, geanker­d op een
 * basis-jaarinkomen. De vaste aftrekposten (zelfstandigenaftrek,
 * heffingskortingsbasis) vallen weg in dit verschil, waardoor de schatting
 * robuust is ongeacht het exacte basisniveau.
 *
 * @param netAmount Extra netto-omzet (ex. BTW) van deze factuur.
 * @param baseAnnualRevenue Basis-jaaromzet waarop de factuur bovenop komt.
 * @returns Marginale IB in euro's (≥ 0), afgerond op 2 decimalen.
 */
export function estimateMarginalIncomeTax(
  netAmount: number,
  baseAnnualRevenue: number,
): number {
  if (netAmount <= 0) return 0;
  const withInvoice = nettoIBAtRevenue(baseAnnualRevenue + netAmount);
  const without = nettoIBAtRevenue(baseAnnualRevenue);
  return Math.max(0, roundMoney(withInvoice - without));
}

/**
 * Ontleed een factuur in BTW, IB-reservering en "van jou".
 *
 * @param input.subtotalExVat Netto factuurbedrag (ex. BTW).
 * @param input.vatRate BTW-tarief (0 / 9 / 21).
 * @param input.vatAmount Optioneel exact BTW-bedrag; anders berekend uit tarief.
 * @param input.profile Fiscaal profiel voor de IB-schatting.
 */
export function calculateInvoiceTruth(input: {
  subtotalExVat: number;
  vatRate: VatRate;
  vatAmount?: number;
  profile: FiscalProfileInput;
}): InvoiceTruth {
  const net = roundMoney(Math.max(0, input.subtotalExVat));
  const btw =
    input.vatAmount != null
      ? roundMoney(Math.max(0, input.vatAmount))
      : calculateInvoiceVatAmount(net, input.vatRate);
  const clientPays = roundMoney(net + btw);

  const personalised =
    input.profile.estimatedAnnualIncome != null &&
    input.profile.estimatedAnnualIncome > 0;
  const baseRevenue = personalised
    ? (input.profile.estimatedAnnualIncome as number)
    : DEFAULT_ASSUMED_ANNUAL_REVENUE;

  const incomeTaxReserve = estimateMarginalIncomeTax(net, baseRevenue);
  const yours = roundMoney(net - incomeTaxReserve);
  const marginalRate = net > 0 ? incomeTaxReserve / net : 0;

  return {
    clientPays,
    net,
    btw,
    vatRate: input.vatRate,
    incomeTaxReserve,
    yours,
    marginalRate,
    personalised,
  };
}
