/**
 * Proration Calculator
 *
 * Berekent het pro-rata bedrag bij een abonnement upgrade/downgrade.
 * Ongebruikte dagen van het huidige plan worden verrekend met het nieuwe plan.
 */

interface ProrationResult {
  remainingDays: number;
  totalDaysInPeriod: number;
  currentPlanCredit: number;
  newPlanCharge: number;
  prorationAmount: number;
  isUpgrade: boolean;
}

/**
 * Bereken pro-rata bedrag bij planwijziging.
 *
 * @param currentPriceCents Huidige plan prijs in centen per maand
 * @param newPriceCents Nieuwe plan prijs in centen per maand
 * @param periodStart Start van de huidige periode
 * @param periodEnd Einde van de huidige periode
 * @param changeDate Datum van de wijziging (default: vandaag)
 */
export function calculateProration(
  currentPriceCents: number,
  newPriceCents: number,
  periodStart: string,
  periodEnd: string,
  changeDate: string = new Date().toISOString()
): ProrationResult {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const change = new Date(changeDate);

  const totalDaysInPeriod = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const remainingDays = Math.max(
    0,
    Math.ceil((end.getTime() - change.getTime()) / (1000 * 60 * 60 * 24))
  );

  const dailyRateCurrent = currentPriceCents / totalDaysInPeriod;
  const dailyRateNew = newPriceCents / totalDaysInPeriod;

  // Credit voor ongebruikte dagen huidig plan
  const currentPlanCredit = Math.round(dailyRateCurrent * remainingDays);

  // Kosten voor resterende dagen nieuw plan
  const newPlanCharge = Math.round(dailyRateNew * remainingDays);

  // Netto bedrag (positief = bijbetalen, negatief = tegoed)
  const prorationAmount = newPlanCharge - currentPlanCredit;

  return {
    remainingDays,
    totalDaysInPeriod,
    currentPlanCredit,
    newPlanCharge,
    prorationAmount,
    isUpgrade: newPriceCents > currentPriceCents,
  };
}
