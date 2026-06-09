import { describe, it, expect } from "vitest";
import { computeReserve, type ReserveInput } from "./reserve";

const base: ReserveInput = {
  currentBalance: 10_000,
  jaarOmzetExBtw: 50_000,
  jaarKostenExBtw: 10_000,
  investeringen: [],
  maandenVerstreken: 6,
  outputVat: 2_000,
  inputVat: 500,
};

describe("computeReserve", () => {
  it("BTW-reservering = output − input", () => {
    expect(computeReserve(base).estimatedVat).toBe(1_500);
  });

  it("reserveringen tellen op en veilig-te-besteden is saldo − reservering", () => {
    const r = computeReserve(base);
    expect(r.reservedTotal).toBe(Math.round((r.estimatedVat + r.estimatedIncomeTax) * 100) / 100);
    expect(r.safeToSpend).toBe(Math.max(0, Math.round((r.currentBalance - r.reservedTotal) * 100) / 100));
  });

  it("clampt BTW naar 0 bij teruggave (input > output)", () => {
    expect(computeReserve({ ...base, outputVat: 300, inputVat: 800 }).estimatedVat).toBe(0);
  });

  it("clampt veilig-te-besteden naar 0 als de reservering het saldo overstijgt", () => {
    expect(computeReserve({ ...base, currentBalance: 100 }).safeToSpend).toBe(0);
  });

  it("meer kosten → minder IB → meer veilig te besteden (geen optimisme bij nul kosten)", () => {
    const metKosten = computeReserve(base);
    const zonderKosten = computeReserve({ ...base, jaarKostenExBtw: 0 });
    // Zonder kosten is de winst (en dus de IB-reservering) hoger,
    // dus blijft er minder veilig over.
    expect(zonderKosten.estimatedIncomeTax).toBeGreaterThan(metKosten.estimatedIncomeTax);
    expect(metKosten.safeToSpend).toBeGreaterThanOrEqual(zonderKosten.safeToSpend);
  });

  it("taxShieldPotential is 0 bij lage omzet en positief bij voldoende omzet", () => {
    expect(computeReserve({ ...base, jaarOmzetExBtw: 5_000 }).taxShieldPotential).toBe(0);
    expect(computeReserve(base).taxShieldPotential).toBeGreaterThan(0);
  });
});
