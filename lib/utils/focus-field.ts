/**
 * Scrollt een formulierveld in beeld en zet er focus op. Gebruikt na een
 * mislukte validatie zodat de gebruiker direct ziet wélk veld aandacht
 * vraagt — de melding alleen bovenaan tonen is onzichtbaar bij lange
 * formulieren met de submit-knop onderaan.
 */
export function scrollToField(id: string) {
  if (typeof document === "undefined") return;
  // requestAnimationFrame: het veld (of de foutmelding) kan in dezelfde
  // render-cyclus pas zichtbaar worden.
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      el.focus({ preventScroll: true });
    }
  });
}
