import { describe, it, expect } from "vitest";
import {
  adviseerVoorlopigeAanslag,
  BELASTINGRENTE_PERCENTAGE_2026,
  VA_MATERIALITEITSDREMPEL,
} from "./voorlopige-aanslag";

describe("adviseerVoorlopigeAanslag", () => {
  it("adviseert 'ongedekt' met maandbedrag zonder VA-betalingen (juni → 7 maanden)", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 14_000,
      vaBetaald: 0,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.status).toBe("ongedekt");
    expect(advies.openstaand).toBe(14_000);
    expect(advies.resterendeMaanden).toBe(7);
    expect(advies.maandbedrag).toBe(2_000);
    expect(advies.afgelopenJaar).toBe(false);
    expect(advies.materieel).toBe(true);
  });

  it("adviseert 'deels' bij een gedeeltelijke dekking", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 12_000,
      vaBetaald: 5_000,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 0,
    });

    expect(advies.status).toBe("deels");
    expect(advies.openstaand).toBe(7_000);
    expect(advies.resterendeMaanden).toBe(12);
    expect(advies.maandbedrag).toBe(Math.ceil(7_000 / 12));
  });

  it("adviseert 'gedekt' wanneer betalingen de heffing dekken (ook bij overdekking)", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 10_000,
      vaBetaald: 11_000,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.status).toBe("gedekt");
    expect(advies.openstaand).toBe(0);
    expect(advies.maandbedrag).toBe(0);
    expect(advies.renteRisicoPerMaand).toBe(0);
    expect(advies.materieel).toBe(false);
  });

  it("geeft 'geen' zonder verwachte heffing", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 0,
      vaBetaald: 0,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.status).toBe("geen");
    expect(advies.materieel).toBe(false);
  });

  it("spreidt in december over precies één maand", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 9_999,
      vaBetaald: 0,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 11,
    });

    expect(advies.resterendeMaanden).toBe(1);
    expect(advies.maandbedrag).toBe(9_999);
  });

  it("geeft voor een afgelopen jaar geen maandbedrag maar wel rente-risico", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 14_000,
      vaBetaald: 4_000,
      jaar: 2025,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.afgelopenJaar).toBe(true);
    expect(advies.resterendeMaanden).toBe(0);
    expect(advies.maandbedrag).toBe(0);
    expect(advies.renteRisicoPerMaand).toBe(
      Math.round(((10_000 * BELASTINGRENTE_PERCENTAGE_2026) / 12) * 100) / 100,
    );
  });

  it("spreidt een toekomstig jaar over 12 maanden", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 12_000,
      vaBetaald: 0,
      jaar: 2027,
      huidigJaar: 2026,
      huidigeMaandIndex: 11,
    });

    expect(advies.resterendeMaanden).toBe(12);
    expect(advies.maandbedrag).toBe(1_000);
  });

  it("rondt het maandbedrag naar boven op hele euro's", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: 10_000,
      vaBetaald: 0,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.maandbedrag).toBe(Math.ceil(10_000 / 7));
    expect(advies.maandbedrag * advies.resterendeMaanden).toBeGreaterThanOrEqual(
      advies.openstaand,
    );
  });

  it("markeert kleine openstaande bedragen als niet-materieel", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: VA_MATERIALITEITSDREMPEL - 1,
      vaBetaald: 0,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.status).toBe("ongedekt");
    expect(advies.materieel).toBe(false);
  });

  it("behandelt negatieve en NaN-inputs defensief als nul", () => {
    const advies = adviseerVoorlopigeAanslag({
      verwachteHeffing: Number.NaN,
      vaBetaald: -500,
      jaar: 2026,
      huidigJaar: 2026,
      huidigeMaandIndex: 5,
    });

    expect(advies.status).toBe("geen");
    expect(advies.openstaand).toBe(0);
    expect(advies.renteRisicoPerMaand).toBe(0);
  });
});
