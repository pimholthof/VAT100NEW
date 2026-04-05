import type { SafeToSpendData } from "@/lib/types";

export interface HealthFactor {
  name: string;
  score: number;
  message: string;
}

export interface FinancialHealth {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  factors: HealthFactor[];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

/**
 * Bereken de financiële gezondheidsscore voor een freelancer.
 *
 * Vier factoren, elk 25% gewicht:
 * 1. Betaalsnelheid (DSO) — hoe snel betalen klanten?
 * 2. Openstaande facturen ratio — hoeveel omzet staat nog open?
 * 3. Belastingreserve — genoeg opzij voor BTW + IB?
 * 4. Administratie — is alles bijgewerkt?
 */
export function calculateFinancialHealth(params: {
  /** Gemiddeld aantal dagen tot betaling (Days Sales Outstanding) */
  averageDSO: number;
  /** Totaal openstaand bedrag (sent + overdue facturen) */
  openInvoiceAmount: number;
  /** Totale omzet dit jaar */
  yearRevenue: number;
  /** Safe-to-spend data */
  safeToSpend: SafeToSpendData;
  /** Aantal bonnen deze maand */
  receiptsThisMonth: number;
  /** Laatste bank sync (dagen geleden, null als geen bank) */
  daysSinceLastBankSync: number | null;
  /** Aantal verlopen facturen */
  overdueCount: number;
}): FinancialHealth {
  const factors: HealthFactor[] = [];

  // Factor 1: Betaalsnelheid (DSO)
  let dsoScore: number;
  let dsoMessage: string;
  if (params.averageDSO <= 14) {
    dsoScore = 100;
    dsoMessage = "Uitstekend — klanten betalen binnen 2 weken";
  } else if (params.averageDSO <= 30) {
    dsoScore = 80;
    dsoMessage = `Goed — gemiddeld ${Math.round(params.averageDSO)} dagen`;
  } else if (params.averageDSO <= 60) {
    dsoScore = 50;
    dsoMessage = `Matig — gemiddeld ${Math.round(params.averageDSO)} dagen. Overweeg kortere betaaltermijnen`;
  } else {
    dsoScore = 20;
    dsoMessage = `Zorgelijk — gemiddeld ${Math.round(params.averageDSO)} dagen. Stuur sneller herinneringen`;
  }
  if (params.yearRevenue === 0) {
    dsoScore = 50;
    dsoMessage = "Nog geen facturen betaald dit jaar";
  }
  factors.push({ name: "Betaalsnelheid", score: dsoScore, message: dsoMessage });

  // Factor 2: Openstaande facturen ratio
  const openRatio = params.yearRevenue > 0
    ? (params.openInvoiceAmount / params.yearRevenue) * 100
    : 0;
  let openScore: number;
  let openMessage: string;
  if (openRatio < 10) {
    openScore = 100;
    openMessage = "Weinig openstaand — goed geïnd";
  } else if (openRatio < 25) {
    openScore = 70;
    openMessage = `${Math.round(openRatio)}% van omzet staat open`;
  } else if (openRatio < 50) {
    openScore = 40;
    openMessage = `${Math.round(openRatio)}% van omzet staat open — stuur herinneringen`;
  } else {
    openScore = 10;
    openMessage = `${Math.round(openRatio)}% van omzet staat open — cashflow risico`;
  }
  if (params.overdueCount > 0) {
    openScore = Math.max(10, openScore - params.overdueCount * 10);
    openMessage += ` (${params.overdueCount} verlopen)`;
  }
  factors.push({ name: "Openstaande facturen", score: clamp(openScore, 0, 100), message: openMessage });

  // Factor 3: Belastingreserve
  const { safeToSpend: sts } = params;
  let taxScore: number;
  let taxMessage: string;
  if (sts.reservedTotal === 0) {
    taxScore = 50;
    taxMessage = "Nog geen belastingreserve nodig";
  } else if (sts.safeToSpend > sts.reservedTotal * 0.5) {
    taxScore = 100;
    taxMessage = "Ruim voldoende reserve voor BTW en inkomstenbelasting";
  } else if (sts.safeToSpend > 0) {
    taxScore = 60;
    taxMessage = "Voldoende reserve, maar houd je uitgaven in de gaten";
  } else {
    taxScore = 15;
    taxMessage = "Onvoldoende reserve — je geeft meer uit dan je kunt";
  }
  factors.push({ name: "Belastingreserve", score: taxScore, message: taxMessage });

  // Factor 4: Administratie bijgewerkt
  let adminScore = 100;
  const adminParts: string[] = [];

  if (params.receiptsThisMonth === 0) {
    adminScore -= 30;
    adminParts.push("geen bonnen deze maand");
  }
  if (params.daysSinceLastBankSync !== null && params.daysSinceLastBankSync > 7) {
    adminScore -= 30;
    adminParts.push(`bank ${params.daysSinceLastBankSync} dagen niet gesynchroniseerd`);
  }
  if (params.daysSinceLastBankSync === null) {
    adminScore -= 20;
    adminParts.push("geen bankkoppeling");
  }

  const adminMessage = adminScore >= 80
    ? "Administratie is up-to-date"
    : `Let op: ${adminParts.join(", ")}`;

  factors.push({ name: "Administratie", score: clamp(adminScore, 0, 100), message: adminMessage });

  // Gewogen gemiddelde (gelijk gewicht)
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length
  );

  const grade = gradeFromScore(totalScore);
  const summaries: Record<string, string> = {
    A: "Je financiën zijn uitstekend op orde",
    B: "Goed op weg, kleine verbeterpunten",
    C: "Aandachtspunten in je administratie",
    D: "Actie vereist: financiële risico's",
    F: "Kritiek: directe actie nodig",
  };

  return {
    score: totalScore,
    grade,
    summary: summaries[grade],
    factors,
  };
}
