import { describe, it, expect } from "vitest";
import { calculateAnnualFigures } from "./calculate-figures";
import type { RawFinancialData, AnnualFigures } from "./types";

// ─── Test data factory ───

function makeData(overrides: Partial<RawFinancialData> = {}): RawFinancialData {
  return {
    invoices: [],
    expenses: [],
    bankTransactions: [],
    vatDeclarations: [],
    assets: [],
    profile: {
      full_name: "Test User",
      studio_name: "Test Studio",
      kvk_number: "12345678",
      btw_number: "NL123456789B01",
      address: "Teststraat 1",
      city: "Amsterdam",
      postal_code: "1000AA",
      iban: "NL00BANK0123456789",
      bic: "BANKBIC",
    },
    priorYearFigures: null,
    ...overrides,
  };
}

// ─── Tests ───

describe("calculateAnnualFigures", () => {
  it("returns zero figures for empty data", () => {
    const result = calculateAnnualFigures(2025, makeData());

    expect(result.fiscalYear).toBe(2025);
    expect(result.revenue.total).toBe(0);
    expect(result.expensesTotal).toBe(0);
    expect(result.depreciationTotal).toBe(0);
    expect(result.result).toBe(0);
    expect(result.balanceSheet.assets.total).toBe(result.balanceSheet.liabilities.total);
  });

  it("calculates revenue correctly from invoices", () => {
    const data = makeData({
      invoices: [
        {
          id: "1",
          invoice_number: "2025-001",
          issue_date: "2025-03-15",
          subtotal_ex_vat: 5000,
          vat_amount: 1050,
          vat_rate: 21,
          status: "paid",
          client_name: "Client A",
        },
        {
          id: "2",
          invoice_number: "2025-002",
          issue_date: "2025-06-10",
          subtotal_ex_vat: 3000,
          vat_amount: 630,
          vat_rate: 21,
          status: "sent",
          client_name: "Client B",
        },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.revenue.domestic).toBe(8000);
    expect(result.revenue.total).toBe(8000);
  });

  it("splits revenue by VAT type (domestic vs outside EU)", () => {
    const data = makeData({
      invoices: [
        {
          id: "1",
          invoice_number: "2025-001",
          issue_date: "2025-02-01",
          subtotal_ex_vat: 10000,
          vat_amount: 2100,
          vat_rate: 21,
          status: "paid",
          client_name: "NL Client",
        },
        {
          id: "2",
          invoice_number: "2025-002",
          issue_date: "2025-04-01",
          subtotal_ex_vat: 5000,
          vat_amount: 0,
          vat_rate: 0,
          status: "paid",
          client_name: "US Client",
        },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.revenue.domestic).toBe(10000);
    expect(result.revenue.outsideEu).toBe(5000);
    expect(result.revenue.total).toBe(15000);
  });

  it("excludes draft invoices from revenue", () => {
    const data = makeData({
      invoices: [
        {
          id: "1",
          invoice_number: "2025-001",
          issue_date: "2025-01-15",
          subtotal_ex_vat: 1000,
          vat_amount: 210,
          vat_rate: 21,
          status: "paid",
          client_name: "A",
        },
        {
          id: "2",
          invoice_number: "2025-002",
          issue_date: "2025-02-15",
          subtotal_ex_vat: 2000,
          vat_amount: 420,
          vat_rate: 21,
          status: "draft",
          client_name: "B",
        },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.revenue.total).toBe(1000);
  });

  it("groups expenses by category with correct totals", () => {
    const data = makeData({
      expenses: [
        { id: "1", vendor_name: "Adobe", amount_ex_vat: 500, vat_amount: 105, category: "administratie", receipt_date: "2025-03-01" },
        { id: "2", vendor_name: "Shell", amount_ex_vat: 300, vat_amount: 63, category: "transport", receipt_date: "2025-04-01" },
        { id: "3", vendor_name: "Office", amount_ex_vat: 200, vat_amount: 42, category: "administratie", receipt_date: "2025-05-01" },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.expensesTotal).toBe(1000);

    const admin = result.expenses.find((e) => e.category === "administratie");
    expect(admin?.amount).toBe(700);
    expect(admin?.percentage).toBe(70);

    const transport = result.expenses.find((e) => e.category === "transport");
    expect(transport?.amount).toBe(300);
  });

  it("normalizes unknown expense categories to 'overig'", () => {
    const data = makeData({
      expenses: [
        { id: "1", vendor_name: "V", amount_ex_vat: 100, vat_amount: 21, category: "unknown_cat", receipt_date: "2025-01-01" },
        { id: "2", vendor_name: "V", amount_ex_vat: 50, vat_amount: 10, category: null, receipt_date: "2025-01-01" },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].category).toBe("overig");
    expect(result.expenses[0].amount).toBe(150);
  });

  it("calculates depreciation respecting residual value floor", () => {
    const data = makeData({
      assets: [
        {
          id: "1",
          description: "MacBook Pro",
          acquisition_date: "2023-01-01",
          acquisition_cost: 3000,
          residual_value: 450,
          depreciation_rate: 20,
          useful_life_months: 60,
        },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.depreciation).toHaveLength(1);

    const mac = result.depreciation[0];
    // After 2 years (2023, 2024): 2 × 600 = 1200 depreciated
    // Book value start 2025: 3000 - 1200 = 1800
    expect(mac.bookValueStart).toBe(1800);
    expect(mac.depreciationAmount).toBe(600);
    expect(mac.bookValueEnd).toBe(1200);
  });

  it("handles partial first-year depreciation", () => {
    const data = makeData({
      assets: [
        {
          id: "1",
          description: "Camera",
          acquisition_date: "2025-07-01", // July = month 6 (0-indexed)
          acquisition_cost: 2400,
          residual_value: 0,
          depreciation_rate: 25,
          useful_life_months: 48,
        },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    const cam = result.depreciation[0];
    // Annual depreciation: 2400 × 25% = 600
    // Months remaining: July-Dec = 6 months
    // Pro-rated: 600 × 6/12 = 300
    expect(cam.bookValueStart).toBe(2400);
    expect(cam.depreciationAmount).toBe(300);
    expect(cam.bookValueEnd).toBe(2100);
  });

  it("stops depreciation at residual value", () => {
    const data = makeData({
      assets: [
        {
          id: "1",
          description: "Old Desk",
          acquisition_date: "2020-01-01",
          acquisition_cost: 1000,
          residual_value: 100,
          depreciation_rate: 20,
          useful_life_months: 60,
        },
      ],
    });

    // After 5 years: 5 × 200 = 1000, but capped at 1000 - 100 = 900
    // So by 2025, book value = 100 (residual), no more depreciation
    const result = calculateAnnualFigures(2025, data);
    const desk = result.depreciation[0];
    expect(desk.bookValueStart).toBe(100);
    expect(desk.depreciationAmount).toBe(0);
    expect(desk.bookValueEnd).toBe(100);
  });

  it("equity movement always balances", () => {
    const priorFigures: AnnualFigures = {
      fiscalYear: 2024,
      revenue: { domestic: 20000, outsideEu: 0, intraEu: 0, total: 20000 },
      expenses: [{ category: "overig", amount: 5000, percentage: 100 }],
      expensesTotal: 5000,
      depreciation: [],
      depreciationTotal: 0,
      result: 15000,
      balanceSheet: {
        assets: { tangibleFixed: 0, currentAssets: 0, cash: 10000, total: 10000 },
        liabilities: { equity: 8000, currentLiabilities: 2000, total: 10000 },
      },
      equity: { openingBalance: 0, result: 15000, privateWithdrawals: 7000, closingBalance: 8000 },
      vat: { quarters: [], totalCharged: 0, totalInput: 0, totalBalance: 0, liabilityAtYearEnd: 2000 },
      priorYear: null,
    };

    const data = makeData({
      invoices: [
        { id: "1", invoice_number: "2025-001", issue_date: "2025-05-01", subtotal_ex_vat: 12000, vat_amount: 2520, vat_rate: 21, status: "paid", client_name: "A" },
      ],
      bankTransactions: [
        { id: "1", booking_date: "2025-12-31", amount: 15000, description: null, counterpart_name: null },
      ],
      priorYearFigures: priorFigures,
    });

    const result = calculateAnnualFigures(2025, data);

    // Equity = opening + result - withdrawals = closing
    expect(result.equity.closingBalance).toBe(
      result.equity.openingBalance + result.equity.result - result.equity.privateWithdrawals
    );
  });

  it("VAT quarters sum to annual total", () => {
    const data = makeData({
      vatDeclarations: [
        { id: "1", period: "Q1 2025", vat_charged: 1000, vat_input: 200, balance: 800 },
        { id: "2", period: "Q2 2025", vat_charged: 1500, vat_input: 300, balance: 1200 },
        { id: "3", period: "Q3 2025", vat_charged: 800, vat_input: 150, balance: 650 },
        { id: "4", period: "Q4 2025", vat_charged: 1200, vat_input: 250, balance: 950 },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.vat.totalCharged).toBe(4500);
    expect(result.vat.totalInput).toBe(900);
    expect(result.vat.totalBalance).toBe(3600);
    expect(result.vat.quarters).toHaveLength(4);
    expect(result.vat.liabilityAtYearEnd).toBe(950);
  });

  it("calculates VAT from invoices/expenses when no declarations exist", () => {
    const data = makeData({
      invoices: [
        { id: "1", invoice_number: "2025-001", issue_date: "2025-02-01", subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, status: "paid", client_name: "A" },
        { id: "2", invoice_number: "2025-002", issue_date: "2025-11-15", subtotal_ex_vat: 2000, vat_amount: 420, vat_rate: 21, status: "paid", client_name: "B" },
      ],
      expenses: [
        { id: "1", vendor_name: "V", amount_ex_vat: 500, vat_amount: 105, category: "overig", receipt_date: "2025-02-15" },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    // Q1: charged 210, input 105, balance 105
    // Q4: charged 420, input 0, balance 420
    expect(result.vat.quarters[0].charged).toBe(210);
    expect(result.vat.quarters[0].input).toBe(105);
    expect(result.vat.quarters[3].charged).toBe(420);
    expect(result.vat.liabilityAtYearEnd).toBe(420);
  });

  it("handles first year (no prior year data)", () => {
    const data = makeData({
      invoices: [
        { id: "1", invoice_number: "2025-001", issue_date: "2025-06-01", subtotal_ex_vat: 5000, vat_amount: 1050, vat_rate: 21, status: "paid", client_name: "A" },
      ],
      priorYearFigures: null,
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.priorYear).toBeNull();
    expect(result.equity.openingBalance).toBe(0);
  });

  it("handles no expenses (only revenue)", () => {
    const data = makeData({
      invoices: [
        { id: "1", invoice_number: "2025-001", issue_date: "2025-01-15", subtotal_ex_vat: 10000, vat_amount: 2100, vat_rate: 21, status: "paid", client_name: "A" },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.revenue.total).toBe(10000);
    expect(result.expensesTotal).toBe(0);
    expect(result.expenses).toHaveLength(0);
    expect(result.result).toBe(10000);
  });

  it("handles zero revenue year", () => {
    const data = makeData({
      expenses: [
        { id: "1", vendor_name: "V", amount_ex_vat: 500, vat_amount: 105, category: "administratie", receipt_date: "2025-06-01" },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.revenue.total).toBe(0);
    expect(result.expensesTotal).toBe(500);
    expect(result.result).toBe(-500);
  });

  it("balance sheet always balances (assets = liabilities)", () => {
    const data = makeData({
      invoices: [
        { id: "1", invoice_number: "2025-001", issue_date: "2025-03-01", subtotal_ex_vat: 20000, vat_amount: 4200, vat_rate: 21, status: "paid", client_name: "A" },
        { id: "2", invoice_number: "2025-002", issue_date: "2025-09-01", subtotal_ex_vat: 5000, vat_amount: 1050, vat_rate: 21, status: "sent", client_name: "B" },
      ],
      expenses: [
        { id: "1", vendor_name: "V", amount_ex_vat: 3000, vat_amount: 630, category: "materiaal", receipt_date: "2025-04-01" },
      ],
      bankTransactions: [
        { id: "1", booking_date: "2025-12-31", amount: 25000, description: null, counterpart_name: null },
      ],
      assets: [
        { id: "1", description: "Laptop", acquisition_date: "2025-01-01", acquisition_cost: 2000, residual_value: 200, depreciation_rate: 20, useful_life_months: 60 },
      ],
    });

    const result = calculateAnnualFigures(2025, data);
    expect(result.balanceSheet.assets.total).toBe(result.balanceSheet.liabilities.total);
  });

  it("provides prior year comparison when prior data exists", () => {
    const priorFigures: AnnualFigures = {
      fiscalYear: 2024,
      revenue: { domestic: 18000, outsideEu: 2000, intraEu: 0, total: 20000 },
      expenses: [{ category: "overig", amount: 4000, percentage: 100 }],
      expensesTotal: 4000,
      depreciation: [],
      depreciationTotal: 500,
      result: 15500,
      balanceSheet: {
        assets: { tangibleFixed: 1500, currentAssets: 0, cash: 12000, total: 13500 },
        liabilities: { equity: 12000, currentLiabilities: 1500, total: 13500 },
      },
      equity: { openingBalance: 0, result: 15500, privateWithdrawals: 3500, closingBalance: 12000 },
      vat: { quarters: [], totalCharged: 0, totalInput: 0, totalBalance: 0, liabilityAtYearEnd: 1500 },
      priorYear: null,
    };

    const data = makeData({ priorYearFigures: priorFigures });
    const result = calculateAnnualFigures(2025, data);

    expect(result.priorYear).not.toBeNull();
    expect(result.priorYear?.revenue).toBe(20000);
    expect(result.priorYear?.result).toBe(15500);
    expect(result.priorYear?.equity).toBe(12000);
  });

  it("is deterministic: same input always produces same output", () => {
    const data = makeData({
      invoices: [
        { id: "1", invoice_number: "2025-001", issue_date: "2025-05-01", subtotal_ex_vat: 7500, vat_amount: 1575, vat_rate: 21, status: "paid", client_name: "A" },
      ],
      expenses: [
        { id: "1", vendor_name: "V", amount_ex_vat: 1200, vat_amount: 252, category: "administratie", receipt_date: "2025-06-01" },
      ],
    });

    const result1 = calculateAnnualFigures(2025, data);
    const result2 = calculateAnnualFigures(2025, data);

    expect(result1).toEqual(result2);
  });
});
