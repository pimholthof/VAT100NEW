// ─── Annual Account calculation engine ───
// Pure function: all data in, all figures out. No side effects.

import type {
  RawFinancialData,
  AnnualFigures,
  RevenueBreakdown,
  ExpenseLine,
  DepreciationLine,
  BalanceSheet,
  EquityMovement,
  VatQuarter,
  VatReconciliation,
  PriorYearComparison,
} from "./types";

// ─── Expense category mapping ───

const EXPENSE_CATEGORIES = [
  "materiaal",
  "gereedschap",
  "huur",
  "administratie",
  "transport",
  "overig",
  "bankkosten",
] as const;

function normalizeCategory(category: string | null): string {
  if (!category) return "overig";
  const lower = category.toLowerCase().trim();
  const found = EXPENSE_CATEGORIES.find((c) => c === lower);
  return found ?? "overig";
}

// ─── Revenue calculation ───

function calculateRevenue(
  invoices: RawFinancialData["invoices"],
  fiscalYear: number
): RevenueBreakdown {
  let domestic = 0;
  let outsideEu = 0;
  const intraEu = 0;

  for (const inv of invoices) {
    if (inv.status === "draft") continue;
    const year = new Date(inv.issue_date).getFullYear();
    if (year !== fiscalYear) continue;

    const amount = Number(inv.subtotal_ex_vat) || 0;

    // Determine type by vat_rate: 21% or 9% = domestic, 0% needs further check
    // For now, vat_rate > 0 = domestic, vat_rate = 0 = outside EU
    // The task spec mentions vat_type field but current schema uses vat_rate
    if (inv.vat_rate > 0) {
      domestic += amount;
    } else {
      // 0% VAT — could be EU ICP or outside EU
      // Without explicit vat_type, we classify 0% as outside EU
      outsideEu += amount;
    }
  }

  return {
    domestic: round2(domestic),
    outsideEu: round2(outsideEu),
    intraEu: round2(intraEu),
    total: round2(domestic + outsideEu + intraEu),
  };
}

// ─── Expenses calculation ───

function calculateExpenses(
  expenses: RawFinancialData["expenses"],
  fiscalYear: number
): { lines: ExpenseLine[]; total: number } {
  const categoryTotals = new Map<string, number>();

  for (const exp of expenses) {
    const year = exp.receipt_date ? new Date(exp.receipt_date).getFullYear() : null;
    if (year !== fiscalYear) continue;

    const cat = normalizeCategory(exp.category);
    const amount = Number(exp.amount_ex_vat) || 0;
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + amount);
  }

  const total = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);

  const lines: ExpenseLine[] = EXPENSE_CATEGORIES
    .filter((cat) => categoryTotals.has(cat))
    .map((cat) => {
      const amount = categoryTotals.get(cat) ?? 0;
      return {
        category: cat,
        amount: round2(amount),
        percentage: total > 0 ? round2((amount / total) * 100) : 0,
      };
    });

  return { lines, total: round2(total) };
}

// ─── Depreciation calculation ───

function calculateDepreciation(
  assets: RawFinancialData["assets"],
  fiscalYear: number,
  priorYear: AnnualFigures | null
): { lines: DepreciationLine[]; total: number } {
  const lines: DepreciationLine[] = [];
  let total = 0;

  for (const asset of assets) {
    const acquisitionDate = new Date(asset.acquisition_date);
    const acquisitionYear = acquisitionDate.getFullYear();

    // Skip assets acquired after the fiscal year
    if (acquisitionYear > fiscalYear) continue;

    const acquisitionCost = Number(asset.acquisition_cost) || 0;
    const residualValue = Number(asset.residual_value) || 0;
    const rate = Number(asset.depreciation_rate) || 0;

    // Calculate book value at start of fiscal year
    let bookValueStart: number;

    // Check if we have prior year depreciation data for this asset
    const priorDep = priorYear?.depreciation.find(
      (d) => d.description === asset.description && d.acquisitionCost === acquisitionCost
    );

    if (priorDep) {
      bookValueStart = priorDep.bookValueEnd;
    } else if (acquisitionYear === fiscalYear) {
      // Acquired this year — book value start is acquisition cost
      bookValueStart = acquisitionCost;
    } else {
      // No prior year data, calculate from scratch
      const yearsDepreciated = fiscalYear - acquisitionYear;
      const annualDep = acquisitionCost * (rate / 100);
      const totalPriorDep = annualDep * yearsDepreciated;
      bookValueStart = Math.max(residualValue, acquisitionCost - totalPriorDep);
    }

    // If already at residual value, no depreciation
    if (bookValueStart <= residualValue) {
      lines.push({
        description: asset.description,
        acquisitionDate: asset.acquisition_date,
        acquisitionCost,
        bookValueStart,
        depreciationAmount: 0,
        bookValueEnd: bookValueStart,
        residualValue,
        rate,
      });
      continue;
    }

    // Calculate depreciation for this year
    let depreciationAmount = acquisitionCost * (rate / 100);

    // For partial first year: pro-rate based on months
    if (acquisitionYear === fiscalYear) {
      const monthsRemaining = 12 - acquisitionDate.getMonth();
      depreciationAmount = (depreciationAmount * monthsRemaining) / 12;
    }

    // Cap at book value minus residual value
    depreciationAmount = Math.min(depreciationAmount, bookValueStart - residualValue);
    depreciationAmount = round2(Math.max(0, depreciationAmount));

    const bookValueEnd = round2(bookValueStart - depreciationAmount);

    lines.push({
      description: asset.description,
      acquisitionDate: asset.acquisition_date,
      acquisitionCost,
      bookValueStart: round2(bookValueStart),
      depreciationAmount,
      bookValueEnd,
      residualValue,
      rate,
    });

    total += depreciationAmount;
  }

  return { lines, total: round2(total) };
}

// ─── Cash (closing bank balance) ───

function calculateCash(
  bankTransactions: RawFinancialData["bankTransactions"],
  fiscalYear: number
): number {
  // Find last transaction on or before 31 December of the fiscal year
  const yearEnd = `${fiscalYear}-12-31`;
  let lastBalance = 0;
  let runningBalance = 0;

  // Sort by date ascending
  const sorted = [...bankTransactions].sort(
    (a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
  );

  for (const tx of sorted) {
    if (tx.booking_date > yearEnd) break;
    runningBalance += Number(tx.amount) || 0;
    lastBalance = runningBalance;
  }

  return round2(lastBalance);
}

// ─── VAT reconciliation ───

function calculateVat(
  vatDeclarations: RawFinancialData["vatDeclarations"],
  invoices: RawFinancialData["invoices"],
  expenses: RawFinancialData["expenses"],
  fiscalYear: number
): VatReconciliation {
  const quarters: VatQuarter[] = [];
  let totalCharged = 0;
  let totalInput = 0;
  let totalBalance = 0;

  for (let q = 1; q <= 4; q++) {
    const period = `Q${q} ${fiscalYear}`;

    // Check if we have a declaration for this quarter
    const declaration = vatDeclarations.find((d) => d.period === period);

    if (declaration) {
      const charged = Number(declaration.vat_charged) || 0;
      const input = Number(declaration.vat_input) || 0;
      const balance = Number(declaration.balance) || 0;

      quarters.push({ period, charged, input, balance });
      totalCharged += charged;
      totalInput += input;
      totalBalance += balance;
    } else {
      // Calculate from invoices and expenses for this quarter
      const qStartMonth = (q - 1) * 3;
      const qStart = new Date(fiscalYear, qStartMonth, 1);
      const qEnd = new Date(fiscalYear, qStartMonth + 3, 0);
      const qStartStr = qStart.toISOString().split("T")[0];
      const qEndStr = qEnd.toISOString().split("T")[0];

      let charged = 0;
      for (const inv of invoices) {
        if (inv.status === "draft") continue;
        if (inv.issue_date >= qStartStr && inv.issue_date <= qEndStr) {
          charged += Number(inv.vat_amount) || 0;
        }
      }

      let input = 0;
      for (const exp of expenses) {
        if (exp.receipt_date && exp.receipt_date >= qStartStr && exp.receipt_date <= qEndStr) {
          input += Number(exp.vat_amount) || 0;
        }
      }

      const balance = round2(charged - input);
      quarters.push({
        period,
        charged: round2(charged),
        input: round2(input),
        balance,
      });
      totalCharged += charged;
      totalInput += input;
      totalBalance += balance;
    }
  }

  // Liability at year end: Q4 balance (unpaid at year end)
  const q4 = quarters.find((q) => q.period === `Q4 ${fiscalYear}`);
  const liabilityAtYearEnd = q4 ? q4.balance : 0;

  return {
    quarters,
    totalCharged: round2(totalCharged),
    totalInput: round2(totalInput),
    totalBalance: round2(totalBalance),
    liabilityAtYearEnd: round2(Math.max(0, liabilityAtYearEnd)),
  };
}

// ─── Main calculation function ───

export function calculateAnnualFigures(
  fiscalYear: number,
  data: RawFinancialData
): AnnualFigures {
  const revenue = calculateRevenue(data.invoices, fiscalYear);
  const { lines: expenseLines, total: expensesTotal } = calculateExpenses(
    data.expenses,
    fiscalYear
  );
  const { lines: depreciationLines, total: depreciationTotal } = calculateDepreciation(
    data.assets,
    fiscalYear,
    data.priorYearFigures
  );

  const result = round2(revenue.total - expensesTotal - depreciationTotal);

  const cash = calculateCash(data.bankTransactions, fiscalYear);
  const tangibleFixed = depreciationLines.reduce(
    (sum, d) => sum + d.bookValueEnd,
    0
  );

  const vat = calculateVat(
    data.vatDeclarations,
    data.invoices,
    data.expenses,
    fiscalYear
  );

  // Current liabilities = VAT payable at year end
  const currentLiabilities = vat.liabilityAtYearEnd;

  // Current assets: receivables (sent but unpaid invoices)
  let currentAssets = 0;
  for (const inv of data.invoices) {
    if (inv.status === "sent" || inv.status === "overdue") {
      const year = new Date(inv.issue_date).getFullYear();
      if (year === fiscalYear) {
        currentAssets += (Number(inv.subtotal_ex_vat) || 0) + (Number(inv.vat_amount) || 0);
      }
    }
  }
  currentAssets = round2(currentAssets);

  const totalAssets = round2(tangibleFixed + currentAssets + cash);
  const equity = round2(totalAssets - currentLiabilities);

  const balanceSheet: BalanceSheet = {
    assets: {
      tangibleFixed: round2(tangibleFixed),
      currentAssets,
      cash,
      total: totalAssets,
    },
    liabilities: {
      equity,
      currentLiabilities,
      total: totalAssets, // Assets must equal liabilities + equity
    },
  };

  // Equity movement
  const openingBalance = data.priorYearFigures?.balanceSheet.liabilities.equity ?? 0;
  const privateWithdrawals = round2(openingBalance + result - equity);

  const equityMovement: EquityMovement = {
    openingBalance: round2(openingBalance),
    result,
    privateWithdrawals,
    closingBalance: equity,
  };

  // Prior year comparison
  let priorYear: PriorYearComparison | null = null;
  if (data.priorYearFigures) {
    const pf = data.priorYearFigures;
    priorYear = {
      revenue: pf.revenue.total,
      expenses: pf.expensesTotal,
      depreciation: pf.depreciationTotal,
      result: pf.result,
      tangibleFixed: pf.balanceSheet.assets.tangibleFixed,
      cash: pf.balanceSheet.assets.cash,
      equity: pf.balanceSheet.liabilities.equity,
      currentLiabilities: pf.balanceSheet.liabilities.currentLiabilities,
    };
  }

  return {
    fiscalYear,
    revenue,
    expenses: expenseLines,
    expensesTotal,
    depreciation: depreciationLines,
    depreciationTotal,
    result,
    balanceSheet,
    equity: equityMovement,
    vat,
    priorYear,
  };
}

// ─── Utility ───

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
