import { describe, it, expect } from "vitest";
import {
  checkSuppletieDrempel,
  SUPPLETIE_DREMPEL,
} from "./suppletie-drempel";

describe("checkSuppletieDrempel", () => {
  it("valt binnen de drempel bij een klein te betalen verschil", () => {
    const r = checkSuppletieDrempel(2_000, 2_500);
    expect(r.verschil).toBe(500);
    expect(r.binnenDrempel).toBe(true);
  });

  it("valt binnen de drempel bij precies € 1.000", () => {
    const r = checkSuppletieDrempel(2_000, 2_000 + SUPPLETIE_DREMPEL);
    expect(r.verschil).toBe(1_000);
    expect(r.binnenDrempel).toBe(true);
  });

  it("valt buiten de drempel net boven € 1.000", () => {
    const r = checkSuppletieDrempel(2_000, 3_000.01);
    expect(r.verschil).toBe(1_000.01);
    expect(r.binnenDrempel).toBe(false);
  });

  it("geldt ook voor een teruggave (negatief verschil)", () => {
    const r = checkSuppletieDrempel(2_000, 1_400);
    expect(r.verschil).toBe(-600);
    expect(r.binnenDrempel).toBe(true);
  });

  it("valt buiten de drempel bij een grote teruggave", () => {
    const r = checkSuppletieDrempel(5_000, 2_000);
    expect(r.verschil).toBe(-3_000);
    expect(r.binnenDrempel).toBe(false);
  });

  it("toont geen hint als er niets te corrigeren valt", () => {
    const r = checkSuppletieDrempel(2_000, 2_000);
    expect(r.verschil).toBe(0);
    expect(r.binnenDrempel).toBe(false);
  });

  it("rondt centen netjes af in het verschil", () => {
    const r = checkSuppletieDrempel(100.1, 100.305);
    expect(r.verschil).toBe(0.21);
    expect(r.binnenDrempel).toBe(true);
  });

  it("behandelt NaN defensief als nul", () => {
    const r = checkSuppletieDrempel(Number.NaN, 500);
    expect(r.verschil).toBe(500);
    expect(r.binnenDrempel).toBe(true);
  });
});
