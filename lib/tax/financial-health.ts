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
    dsoMessage = "Top — klanten betalen snel";
  } else if (params.averageDSO <= 30) {
    dsoScore = 80;
    dsoMessage = `Gemiddeld ${Math.round(params.averageDSO)} dagen — prima`;
  } else if (params.averageDSO <= 60) {
    dsoScore = 50;
    dsoMessage = `Gemiddeld ${Math.round(params.averageDSO)} dagen — kortere termijnen helpen`;
  } else {
    dsoScore = 30;
    dsoMessage = `Gemiddeld ${Math.round(params.averageDSO)} dagen — herinneringen helpen`;
  }
  if (params.yearRevenue === 0) {
    dsoScore = 60;
    dsoMessage = "Stuur je eerste factuur om te beginnen";
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
    openMessage = "Bijna alles geïnd — netjes";
  } else if (openRatio < 25) {
    openScore = 70;
    openMessage = `${Math.round(openRatio)}% staat nog open`;
  } else if (openRatio < 50) {
    openScore = 45;
    openMessage = `${Math.round(openRatio)}% staat open — een herinnering kan helpen`;
  } else {
    openScore = 20;
    openMessage = `${Math.round(openRatio)}% staat open — stuur een herinnering`;
  }
  if (params.overdueCount > 0) {
    openScore = Math.max(15, openScore - params.overdueCount * 8);
    openMessage += ` · ${params.overdueCount} te laat`;
  }
  factors.push({ name: "Openstaand", score: clamp(openScore, 0, 100), message: openMessage });

  // Factor 3: Belastingreserve
  const { safeToSpend: sts } = params;
  let taxScore: number;
  let taxMessage: string;
  if (sts.currentBalance === 0 && sts.reservedTotal === 0) {
    taxScore = 60;
    taxMessage = "Koppel je bank voor meer inzicht";
  } else if (sts.reservedTotal === 0) {
    taxScore = 60;
    taxMessage = "Nog geen reserve nodig";
  } else if (sts.safeToSpend > sts.reservedTotal * 0.5) {
    taxScore = 100;
    taxMessage = "Voldoende opzij voor BTW en IB";
  } else if (sts.safeToSpend > 0) {
    taxScore = 65;
    taxMessage = "Reserve is krap — hou je uitgaven in de gaten";
  } else {
    taxScore = 25;
    taxMessage = "Zet wat extra opzij voor de belasting";
  }
  factors.push({ name: "Reserve", score: taxScore, message: taxMessage });

  // Factor 4: Administratie bijgewerkt
  let adminScore = 100;
  const adminTips: string[] = [];

  if (params.receiptsThisMonth === 0) {
    adminScore -= 25;
    adminTips.push("voeg bonnen toe");
  }
  if (params.daysSinceLastBankSync !== null && params.daysSinceLastBankSync > 7) {
    adminScore -= 25;
    adminTips.push("synchroniseer je bank");
  }
  if (params.daysSinceLastBankSync === null) {
    adminScore -= 5; // Bank is optioneel
  }

  const adminMessage = adminScore >= 80
    ? "Up-to-date"
    : `Tip: ${adminTips.join(" en ")}`;

  factors.push({ name: "Administratie", score: clamp(adminScore, 0, 100), message: adminMessage });

  // Gewogen gemiddelde (gelijk gewicht)
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length
  );

  const grade = gradeFromScore(totalScore);
  const summaries: Record<string, string> = {
    A: "Alles loopt lekker",
    B: "Goed op weg",
    C: "Een paar dingen om op te letten",
    D: "Er zijn verbeterpunten",
    F: "Hier kun je winst pakken",
  };

  return {
    score: totalScore,
    grade,
    summary: summaries[grade],
    factors,
  };
}
