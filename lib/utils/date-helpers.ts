/**
 * Datum-helpers — één bron van waarheid voor datum-strings in het project.
 *
 * Alle datums in het domein (bonnen, facturen, btw-aangifte, enz.) zijn
 * YYYY-MM-DD strings, niet Date-objecten, zodat ze timezone-onafhankelijk
 * in Supabase opgeslagen kunnen worden en direct naar de frontend gaan.
 */

/**
 * Vandaag als YYYY-MM-DD string (UTC).
 *
 * Let op: gebruikt `toISOString()`, dus rond middernacht lokale tijd kan de
 * uitkomst één dag verschillen van wat een gebruiker op het scherm ziet.
 * Dat is een bewuste keuze: server-side consistentie > lokaal correct.
 */
export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Datum N dagen vanaf vandaag als YYYY-MM-DD string. Negatieve waarden
 * leveren een datum in het verleden.
 */
export function daysFromTodayIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Begin van de huidige maand (eerste dag) als YYYY-MM-DD string.
 */
export function startOfMonthIso(ref: Date = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth(), 1);
  return d.toISOString().split("T")[0];
}

/**
 * Einde van de huidige maand (laatste dag) als YYYY-MM-DD string.
 */
export function endOfMonthIso(ref: Date = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return d.toISOString().split("T")[0];
}
