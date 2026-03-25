import { describe, it, expect } from "vitest";
import { validate } from "@/lib/validation";
import { clientSchema } from "@/lib/validation";
import type { ClientInput } from "@/lib/types";

/**
 * Tests voor de klant-validatie pipeline die in createNewClient/updateClient wordt gebruikt.
 */

const validInput: ClientInput = {
  name: "Studio Voorbeeld BV",
  contact_name: "Jan de Vries",
  email: "jan@voorbeeld.nl",
  address: "Keizersgracht 100",
  city: "Amsterdam",
  postal_code: "1015 AA",
  kvk_number: "12345678",
  btw_number: "NL123456789B01",
};

describe("createClient validatie pipeline", () => {
  it("valideert correcte input", () => {
    const result = validate(clientSchema, validInput);
    expect(result.error).toBeNull();
    expect(result.data?.name).toBe("Studio Voorbeeld BV");
  });

  it("weigert lege naam", () => {
    const result = validate(clientSchema, { ...validInput, name: "" });
    expect(result.error).toBe("Naam is verplicht");
  });

  it("weigert alleen spaties als naam", () => {
    const result = validate(clientSchema, { ...validInput, name: "   " });
    expect(result.error).toBe("Naam is verplicht");
  });

  it("trimt naam automatisch", () => {
    const result = validate(clientSchema, { ...validInput, name: "  Test BV  " });
    expect(result.error).toBeNull();
    expect(result.data?.name).toBe("Test BV");
  });

  it("accepteert minimale input (alleen naam)", () => {
    const result = validate(clientSchema, {
      name: "Minimal BV",
      contact_name: null,
      email: null,
      address: null,
      city: null,
      postal_code: null,
      kvk_number: null,
      btw_number: null,
    });
    expect(result.error).toBeNull();
  });

  it("weigert ongeldig e-mailadres", () => {
    const result = validate(clientSchema, { ...validInput, email: "geen-email" });
    expect(result.error).toBe("Ongeldig e-mailadres");
  });

  it("accepteert leeg e-mailadres", () => {
    const result = validate(clientSchema, { ...validInput, email: null });
    expect(result.error).toBeNull();
  });

  it("accepteert geldig e-mailadres", () => {
    const result = validate(clientSchema, { ...validInput, email: "info@bedrijf.nl" });
    expect(result.error).toBeNull();
  });
});
