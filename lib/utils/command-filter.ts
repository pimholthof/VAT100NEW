// Filterlogica voor het command palette (⌘K). Server-resultaten (facturen,
// klanten) zijn al door de database gefilterd en mogen nooit lokaal
// wegvallen; statische acties en navigatie filteren we fuzzy op label en
// Nederlandse synoniemen (keywords).

const SERVER_RESULT_PREFIXES = ["invoice-", "client-"] as const;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * cmdk `filter`-functie: score 0 verbergt het item, hogere scores sorteren
 * hoger. Substring-match op label of keyword telt het zwaarst; een match
 * waarbij elk zoekwoord een woord-prefix is (bv. "nieu fac") telt lager.
 */
export function commandFilter(
  value: string,
  search: string,
  keywords?: string[]
): number {
  const query = normalize(search.trim());
  if (!query) return 1;

  if (SERVER_RESULT_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return 1;
  }

  const haystacks = [value, ...(keywords ?? [])].map(normalize);
  if (haystacks.some((h) => h.includes(query))) return 1;

  const tokens = query.split(/\s+/).filter(Boolean);
  const words = haystacks.flatMap((h) => h.split(/[\s&·/+-]+/)).filter(Boolean);
  if (
    tokens.length > 0 &&
    tokens.every((token) => words.some((word) => word.startsWith(token)))
  ) {
    return 0.7;
  }

  return 0;
}
