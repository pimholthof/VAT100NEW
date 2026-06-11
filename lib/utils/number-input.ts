// Number-inputs accepteren via het toetsenbord tekens die geen geldig
// positief bedrag opleveren ("-", "+", "e"); min="0" houdt typen niet tegen.
export function blockNonCurrencyKeys(
  e: React.KeyboardEvent<HTMLInputElement>
): void {
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
    e.preventDefault();
  }
}
