import { describe, it, expect } from "vitest";
import {
  buildInvoiceRows,
  buildReceiptRows,
  ACCOUNTANT_INVOICE_HEADERS,
  ACCOUNTANT_RECEIPT_HEADERS,
} from "./accountant-csv";

describe("buildInvoiceRows", () => {
  it("maps a standard 21% invoice to grootboek 8000 + debiteuren", () => {
    const rows = buildInvoiceRows([
      {
        invoice_number: "2026-001",
        issue_date: "2026-04-01",
        client_name: "Studio X",
        description: "Ontwerp logo",
        subtotal_ex_vat: 1000,
        vat_amount: 210,
        total_inc_vat: 1210,
        vat_rate: 21,
        vat_scheme: "standard",
        status: "paid",
      },
    ]);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row[0]).toBe("2026-04-01");
    expect(row[1]).toBe("2026-001");
    expect(row[2]).toBe("Studio X");
    expect(row[4]).toBe("8000"); // Omzet diensten
    expect(row[5]).toBe("1100"); // Debiteuren
    expect(row[6]).toBe("NL_21");
    expect(row[8]).toBe("1000.00");
    expect(row[9]).toBe("210.00");
    expect(row[10]).toBe("1210.00");
  });

  it("uses omzet EU account for reverse-charge invoices", () => {
    const [row] = buildInvoiceRows([
      {
        invoice_number: "2026-002",
        issue_date: "2026-04-02",
        client_name: "Berlin GmbH",
        description: "Consultancy",
        subtotal_ex_vat: 500,
        vat_amount: 0,
        total_inc_vat: 500,
        vat_rate: 0,
        vat_scheme: "eu_reverse_charge",
        status: "sent",
      },
    ]);
    expect(row[4]).toBe("8200");
    expect(row[6]).toBe("NL_VERLEGD_EU");
  });

  it("uses export account for non-EU exports", () => {
    const [row] = buildInvoiceRows([
      {
        invoice_number: "2026-003",
        issue_date: "2026-04-03",
        client_name: "US Client",
        description: "Export",
        subtotal_ex_vat: 1000,
        vat_amount: 0,
        total_inc_vat: 1000,
        vat_rate: 0,
        vat_scheme: "export_outside_eu",
        status: "paid",
      },
    ]);
    expect(row[4]).toBe("8300");
    expect(row[6]).toBe("NL_EXPORT");
  });

  it("has matching header count", () => {
    const [row] = buildInvoiceRows([
      {
        invoice_number: "X",
        issue_date: "2026-01-01",
        client_name: "Y",
        description: "",
        subtotal_ex_vat: 1,
        vat_amount: 0.21,
        total_inc_vat: 1.21,
        vat_rate: 21,
        vat_scheme: "standard",
        status: "draft",
      },
    ]);
    expect(row.length).toBe(ACCOUNTANT_INVOICE_HEADERS.length);
  });
});

describe("buildReceiptRows", () => {
  it("applies business_percentage to deductible amounts", () => {
    const [row] = buildReceiptRows([
      {
        receipt_date: "2026-03-15",
        vendor_name: "Apple",
        description: "MacBook",
        subtotal_ex_vat: 2000,
        vat_amount: 420,
        total_inc_vat: 2420,
        vat_rate: 21,
        business_percentage: 75,
        cost_code: 4330,
        cost_code_name: "Computer & software",
      },
    ]);
    expect(row[3]).toBe("4330");
    expect(row[5]).toBe("2000"); // Crediteuren
    expect(row[8]).toBe("75%");
    expect(row[9]).toBe("1500.00"); // 2000 * 0.75
    expect(row[10]).toBe("315.00"); // 420 * 0.75
    expect(row[11]).toBe("2420.00"); // Full incl
  });

  it("falls back to 4999 when cost_code is missing", () => {
    const [row] = buildReceiptRows([
      {
        receipt_date: "2026-03-10",
        vendor_name: "Onbekend",
        description: "",
        subtotal_ex_vat: 50,
        vat_amount: 10.5,
        total_inc_vat: 60.5,
        vat_rate: 21,
        business_percentage: 100,
        cost_code: null,
        cost_code_name: null,
      },
    ]);
    expect(row[3]).toBe("4999");
    expect(row[4]).toBe("Overige kosten");
  });

  it("clamps invalid business_percentage to 0-100", () => {
    const [row] = buildReceiptRows([
      {
        receipt_date: "2026-03-01",
        vendor_name: "Test",
        description: "",
        subtotal_ex_vat: 100,
        vat_amount: 21,
        total_inc_vat: 121,
        vat_rate: 21,
        business_percentage: 150,
        cost_code: 4300,
        cost_code_name: "Kantoorkosten",
      },
    ]);
    // Clamped to 100
    expect(row[9]).toBe("100.00");
    expect(row[10]).toBe("21.00");
  });

  it("has matching header count", () => {
    const [row] = buildReceiptRows([
      {
        receipt_date: "2026-01-01",
        vendor_name: "X",
        description: "",
        subtotal_ex_vat: 1,
        vat_amount: 0,
        total_inc_vat: 1,
        vat_rate: 0,
        business_percentage: 100,
        cost_code: 4300,
        cost_code_name: "Kantoorkosten",
      },
    ]);
    expect(row.length).toBe(ACCOUNTANT_RECEIPT_HEADERS.length);
  });
});
