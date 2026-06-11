// Validatiefouten verschijnen bij het veld; de submit-knop staat vaak een
// scherm lager. Deze helpers brengen de gebruiker naar de fout toe.

export function scrollToElement(el: HTMLElement | null): void {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Scrollt naar het eerste veld met `aria-invalid="true"` en focust het.
 * Aanroepen ná het zetten van de fout-state (in een rAF zodat de DOM de
 * aria-attributen al heeft).
 */
export function scrollToFirstInvalidField(): void {
  requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus({ preventScroll: true });
  });
}
