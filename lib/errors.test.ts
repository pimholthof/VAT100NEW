import { describe, it, expect } from "vitest";
import { actionErrorStatus } from "./errors";

describe("actionErrorStatus", () => {
  it("maps 'Niet ingelogd.' to 401", () => {
    expect(actionErrorStatus("Niet ingelogd.")).toBe(401);
  });

  it("maps 'Geen toegang.' to 403", () => {
    expect(actionErrorStatus("Geen toegang.")).toBe(403);
  });

  it("maps 'Geen actief abonnement.' to 403", () => {
    expect(actionErrorStatus("Geen actief abonnement.")).toBe(403);
  });

  it("maps 'Onbekend abonnement.' to 403", () => {
    expect(actionErrorStatus("Onbekend abonnement.")).toBe(403);
  });

  it("maps upgrade prompts to 403", () => {
    expect(
      actionErrorStatus("Upgrade naar Studio om deze functie te gebruiken."),
    ).toBe(403);
    expect(
      actionErrorStatus("Upgrade naar Complete om deze functie te gebruiken."),
    ).toBe(403);
  });

  it("falls back to 500 for unknown errors", () => {
    expect(actionErrorStatus("Database connection lost")).toBe(500);
    expect(actionErrorStatus("")).toBe(500);
  });

  it("does not match a stray prefix", () => {
    expect(actionErrorStatus("Niet ingelogd")).toBe(500); // missing period
  });
});
