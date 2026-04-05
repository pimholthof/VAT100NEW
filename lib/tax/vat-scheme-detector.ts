import type { Client, VatScheme, VatRate } from "@/lib/types";

/**
 * EU-lidstaten BTW-nummer prefixen (exclusief NL).
 */
const EU_BTW_PREFIXES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "EL", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

const EU_COUNTRIES = new Set<string>(["NL", ...EU_BTW_PREFIXES]);

export interface VatSchemeDetection {
  scheme: VatScheme;
  rate: VatRate;
  reason: string;
}

/**
 * Detecteert automatisch het juiste BTW-regime op basis van klantgegevens.
 *
 * Logica:
 * - NL BTW-nummer → standaard (21%)
 * - EU BTW-nummer (niet-NL) → intracommunautair / BTW verlegd (0%)
 * - Geen BTW-nummer + EU land → B2C standaard (21%)
 * - Niet-EU land → export buiten EU (0%)
 * - Fallback → standaard (21%)
 */
export function detectVatScheme(client: Pick<Client, "btw_number" | "country">): VatSchemeDetection {
  const btw = client.btw_number?.trim().toUpperCase();

  // Client heeft een BTW-nummer
  if (btw && btw.length >= 2) {
    const prefix = btw.substring(0, 2);

    if (prefix === "NL") {
      return { scheme: "standard", rate: 21, reason: "Nederlandse klant met BTW-nummer" };
    }

    if (EU_BTW_PREFIXES.some((p) => p === prefix)) {
      return {
        scheme: "eu_reverse_charge",
        rate: 0,
        reason: "EU-levering: BTW verlegd (0%)",
      };
    }

    // Non-EU BTW-nummer → export
    return {
      scheme: "export_outside_eu",
      rate: 0,
      reason: "Export buiten EU: geen BTW (0%)",
    };
  }

  // Geen BTW-nummer — kijk naar land
  const country = (client.country ?? "NL").toUpperCase();

  if (country === "NL") {
    return { scheme: "standard", rate: 21, reason: "Nederlandse klant" };
  }

  if (EU_COUNTRIES.has(country)) {
    // EU B2C: gewoon BTW heffen
    return { scheme: "standard", rate: 21, reason: "EU-klant zonder BTW-nummer (B2C)" };
  }

  // Buiten EU
  return {
    scheme: "export_outside_eu",
    rate: 0,
    reason: "Export buiten EU: geen BTW (0%)",
  };
}
