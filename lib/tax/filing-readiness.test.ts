import { describe, it, expect } from "vitest";
import {
  assessBtwFiling,
  assessIbFiling,
  assessJaarrekeningFiling,
  type BtwFilingInput,
} from "./filing-readiness";

const btwBase: BtwFilingInput = {
  period: "Q2 2026",
  periodEnded: true,
  deadline: "2026-07-31",
  daysRemaining: 20,
  returnStatus: "none",
  paid: false,
  incompleteReceiptCount: 0,
  netVat: 800,
  usesKor: false,
};

describe("assessBtwFiling", () => {
  it("een afgesloten, schoon kwartaal is klaar om voor te bereiden", () => {
    const r = assessBtwFiling(btwBase);
    expect(r.status).toBe("klaar");
    expect(r.nextAction).toBe("voorbereiden");
    expect(r.amount).toBe(800);
  });

  it("een nog lopend kwartaal vraagt wachten", () => {
    const r = assessBtwFiling({ ...btwBase, periodEnded: false });
    expect(r.status).toBe("onvolledig");
    expect(r.nextAction).toBe("wachten");
    expect(r.blockers[0].code).toBe("period_open");
  });

  it("onvolledige bonnen vragen eerst controle", () => {
    const r = assessBtwFiling({ ...btwBase, incompleteReceiptCount: 2 });
    expect(r.status).toBe("onvolledig");
    expect(r.nextAction).toBe("controleren");
    expect(r.blockers[0]).toMatchObject({ code: "receipt_incomplete", count: 2 });
  });

  it("een concept zonder problemen is klaar om te vergrendelen", () => {
    const r = assessBtwFiling({ ...btwBase, returnStatus: "draft" });
    expect(r.status).toBe("concept");
    expect(r.nextAction).toBe("vergrendelen");
  });

  it("een vergrendelde aangifte is klaar om in te dienen", () => {
    const r = assessBtwFiling({ ...btwBase, returnStatus: "locked" });
    expect(r.status).toBe("vergrendeld");
    expect(r.nextAction).toBe("indienen");
  });

  it("een ingediende aangifte met openstaand bedrag vraagt betalen", () => {
    const r = assessBtwFiling({ ...btwBase, returnStatus: "submitted", netVat: 800, paid: false });
    expect(r.status).toBe("ingediend");
    expect(r.nextAction).toBe("betalen");
  });

  it("een ingediende, betaalde aangifte is klaar (geen actie)", () => {
    const r = assessBtwFiling({ ...btwBase, returnStatus: "submitted", paid: true });
    expect(r.status).toBe("ingediend");
    expect(r.nextAction).toBeUndefined();
  });

  it("KOR-ondernemer: niet van toepassing", () => {
    const r = assessBtwFiling({ ...btwBase, usesKor: true });
    expect(r.status).toBe("niet_van_toepassing");
    expect(r.nextAction).toBeUndefined();
  });
});

describe("assessIbFiling", () => {
  const ibBase = {
    year: 2025,
    yearEnded: true,
    hasActivity: true,
    profileComplete: true,
    incompleteReceiptCount: 0,
    nettoIB: 4200,
    paid: false,
  };

  it("een afgesloten jaar met compleet profiel is klaar om te controleren", () => {
    const r = assessIbFiling(ibBase);
    expect(r.status).toBe("klaar");
    expect(r.nextAction).toBe("controleren");
    expect(r.amount).toBe(4200);
  });

  it("een onvolledig profiel blokkeert", () => {
    const r = assessIbFiling({ ...ibBase, profileComplete: false });
    expect(r.status).toBe("onvolledig");
    expect(r.blockers.some((b) => b.code === "profile_incomplete")).toBe(true);
  });

  it("lopend jaar zonder activiteit is niet van toepassing", () => {
    const r = assessIbFiling({ ...ibBase, year: 2026, yearEnded: false, hasActivity: false });
    expect(r.status).toBe("niet_van_toepassing");
  });

  it("een vastgelegde aanslag telt als ingediend", () => {
    const r = assessIbFiling({ ...ibBase, paid: true });
    expect(r.status).toBe("ingediend");
  });
});

describe("assessJaarrekeningFiling", () => {
  const jrBase = {
    year: 2025,
    yearEnded: true,
    hasActivity: true,
    balanceBalances: true,
    incompleteReceiptCount: 0,
  };

  it("een sluitende balans op een afgesloten jaar is klaar om te genereren", () => {
    const r = assessJaarrekeningFiling(jrBase);
    expect(r.status).toBe("klaar");
    expect(r.nextAction).toBe("genereren");
  });

  it("een niet-sluitende balans blokkeert", () => {
    const r = assessJaarrekeningFiling({ ...jrBase, balanceBalances: false });
    expect(r.status).toBe("onvolledig");
    expect(r.nextAction).toBe("controleren");
    expect(r.blockers[0].code).toBe("balance_mismatch");
  });

  it("een lopend jaar is voorlopig maar wel te genereren", () => {
    const r = assessJaarrekeningFiling({ ...jrBase, year: 2026, yearEnded: false });
    expect(r.status).toBe("onvolledig");
    expect(r.nextAction).toBe("genereren");
  });
});
