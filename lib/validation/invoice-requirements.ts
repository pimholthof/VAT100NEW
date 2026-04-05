/**
 * Validatie van de 13 wettelijke eisen voor Nederlandse facturen.
 * Gebaseerd op Belastingdienst vereisten.
 *
 * Returns een lijst van warnings (niet-fataal) en errors (blokkerend).
 */

import type { InvoiceData } from "@/lib/types";

export type RequirementSeverity = "error" | "warning";

export interface RequirementResult {
  id: string;
  label: string;
  severity: RequirementSeverity;
  message: string;
  passed: boolean;
}

export function validateDutchInvoiceRequirements(
  data: InvoiceData
): RequirementResult[] {
  const { invoice, lines, client, profile } = data;
  const results: RequirementResult[] = [];

  // 1. Factuurnummer (opeenvolgend, uniek)
  results.push({
    id: "factuurnummer",
    label: "Factuurnummer",
    severity: "error",
    message: "Factuurnummer is verplicht en moet uniek zijn.",
    passed: !!invoice.invoice_number?.trim(),
  });

  // 2. Factuurdatum
  results.push({
    id: "factuurdatum",
    label: "Factuurdatum",
    severity: "error",
    message: "Factuurdatum is verplicht.",
    passed: !!invoice.issue_date,
  });

  // 3. NAW leverancier
  results.push({
    id: "naam_leverancier",
    label: "Naam leverancier",
    severity: "error",
    message: "Je bedrijfsnaam ontbreekt in je profiel.",
    passed: !!(profile.studio_name?.trim() || profile.full_name?.trim()),
  });

  results.push({
    id: "adres_leverancier",
    label: "Adres leverancier",
    severity: "warning",
    message: "Je adres ontbreekt in je profiel. Dit is verplicht op facturen.",
    passed: !!(profile.address?.trim() && profile.city?.trim()),
  });

  // 4. NAW afnemer
  results.push({
    id: "naam_afnemer",
    label: "Naam afnemer",
    severity: "error",
    message: "Klantnaam is verplicht.",
    passed: !!client.name?.trim(),
  });

  results.push({
    id: "adres_afnemer",
    label: "Adres afnemer",
    severity: "warning",
    message: "Klantadres ontbreekt. Dit is verplicht bij facturen boven €100.",
    passed: !!(client.address?.trim() || client.city?.trim()),
  });

  // 5. KVK-nummer leverancier
  results.push({
    id: "kvk_leverancier",
    label: "KVK-nummer",
    severity: "warning",
    message: "Je KVK-nummer ontbreekt in je profiel.",
    passed: !!profile.kvk_number?.trim(),
  });

  // 6. BTW-nummer leverancier
  results.push({
    id: "btw_leverancier",
    label: "BTW-nummer",
    severity: "error",
    message: "Je BTW-nummer ontbreekt in je profiel. Dit is verplicht op facturen.",
    passed: !!profile.btw_number?.trim(),
  });

  // 7. Omschrijving goederen/diensten
  const hasDescriptions = lines.every(
    (l) => l.description?.trim().length > 0
  );
  results.push({
    id: "omschrijving",
    label: "Omschrijving",
    severity: "error",
    message: "Alle factuurregels moeten een omschrijving hebben.",
    passed: lines.length > 0 && hasDescriptions,
  });

  // 8. Aantal en eenheid
  const hasQuantities = lines.every((l) => l.quantity > 0);
  results.push({
    id: "aantal",
    label: "Aantal & eenheid",
    severity: "error",
    message: "Alle factuurregels moeten een geldig aantal hebben.",
    passed: lines.length > 0 && hasQuantities,
  });

  // 9. Eenheidsprijs excl. BTW
  const hasRates = lines.every((l) => l.rate >= 0);
  results.push({
    id: "eenheidsprijs",
    label: "Eenheidsprijs",
    severity: "error",
    message: "Alle factuurregels moeten een geldig tarief hebben.",
    passed: lines.length > 0 && hasRates,
  });

  // 10. BTW-tarief
  results.push({
    id: "btw_tarief",
    label: "BTW-tarief",
    severity: "error",
    message: "BTW-tarief moet vermeld worden (0%, 9% of 21%).",
    passed: [0, 9, 21].includes(invoice.vat_rate),
  });

  // 11. BTW-bedrag
  results.push({
    id: "btw_bedrag",
    label: "BTW-bedrag",
    severity: "warning",
    message: "BTW-bedrag is 0. Controleer of dit klopt.",
    passed: invoice.vat_amount > 0 || invoice.vat_rate === 0 || invoice.vat_scheme !== "standard",
  });

  // 12. Totaalbedrag
  results.push({
    id: "totaalbedrag",
    label: "Totaalbedrag",
    severity: "error",
    message: "Totaalbedrag incl. BTW moet groter zijn dan 0.",
    passed: invoice.total_inc_vat > 0,
  });

  // 13. Betalingsgegevens (IBAN)
  results.push({
    id: "iban",
    label: "IBAN",
    severity: "warning",
    message: "Je IBAN ontbreekt in je profiel. Klanten weten niet waarheen ze moeten betalen.",
    passed: !!profile.iban?.trim(),
  });

  // Extra: BTW-verlegd vermelding bij EU reverse charge
  if (invoice.vat_scheme === "eu_reverse_charge") {
    results.push({
      id: "btw_verlegd",
      label: "BTW verlegd",
      severity: "error",
      message: "BTW-nummer van de afnemer is verplicht bij intracommunautaire levering.",
      passed: !!client.btw_number?.trim(),
    });
  }

  return results;
}
