import { describe, it, expect, beforeEach } from "vitest";
import {
  parseEcbHistoricXml,
  findRateForDate,
  convertToEur,
  loadEcbRates,
} from "./ecb-rates";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time="2026-04-14">
      <Cube currency="USD" rate="1.0850"/>
      <Cube currency="GBP" rate="0.8650"/>
      <Cube currency="JPY" rate="165.50"/>
    </Cube>
    <Cube time="2026-04-15">
      <Cube currency="USD" rate="1.0900"/>
      <Cube currency="GBP" rate="0.8620"/>
      <Cube currency="JPY" rate="166.10"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

describe("parseEcbHistoricXml", () => {
  it("parses multiple days with multiple rates", () => {
    const parsed = parseEcbHistoricXml(SAMPLE_XML);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].date).toBe("2026-04-14");
    expect(parsed[0].rates.USD).toBe(1.085);
    expect(parsed[0].rates.GBP).toBe(0.865);
    expect(parsed[1].date).toBe("2026-04-15");
    expect(parsed[1].rates.JPY).toBe(166.1);
  });

  it("always includes EUR = 1", () => {
    const parsed = parseEcbHistoricXml(SAMPLE_XML);
    expect(parsed[0].rates.EUR).toBe(1);
  });
});

describe("findRateForDate", () => {
  const rates = parseEcbHistoricXml(SAMPLE_XML);

  it("returns exact date match", () => {
    expect(findRateForDate(rates, "USD", "2026-04-15")).toBe(1.09);
  });

  it("returns previous working day when date is after latest", () => {
    expect(findRateForDate(rates, "USD", "2026-04-20")).toBe(1.09);
  });

  it("returns previous working day when date is a weekend (no entry)", () => {
    expect(findRateForDate(rates, "GBP", "2026-04-14")).toBe(0.865);
  });

  it("returns null if date is before the dataset", () => {
    expect(findRateForDate(rates, "USD", "2026-04-01")).toBeNull();
  });

  it("returns 1 for EUR regardless of date", () => {
    expect(findRateForDate(rates, "EUR", "2026-04-15")).toBe(1);
  });
});

describe("convertToEur", () => {
  beforeEach(() => {
    // Reset cache via force
  });

  it("converts USD to EUR using nearest ECB rate", async () => {
    const mockFetch = (async () =>
      ({
        ok: true,
        status: 200,
        text: async () => SAMPLE_XML,
      }) as unknown as Response) as unknown as typeof fetch;

    await loadEcbRates({ fetchFn: mockFetch, force: true });

    const result = await convertToEur(
      1090,
      "USD",
      "2026-04-15",
      { fetchFn: mockFetch }
    );

    expect(result).not.toBeNull();
    expect(result!.rate).toBe(1.09);
    expect(result!.amountEur).toBe(1000); // 1090 / 1.09
    expect(result!.rateDate).toBe("2026-04-15");
    expect(result!.source).toBe("ECB");
  });

  it("returns EUR amount directly without fetch when currency=EUR", async () => {
    const result = await convertToEur(123.45, "EUR", "2026-04-15");
    expect(result).toEqual({
      amountEur: 123.45,
      rate: 1,
      rateDate: "2026-04-15",
      source: "ECB",
    });
  });
});
