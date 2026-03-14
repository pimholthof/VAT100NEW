export interface Kostensoort {
  label: string;
  code: number;
  groep: string;
}

export const KOSTENSOORTEN: Kostensoort[] = [
  { label: "Huur", code: 4100, groep: "Huisvesting" },
  { label: "Energie", code: 4105, groep: "Huisvesting" },
  { label: "Overige huisvestingskosten", code: 4195, groep: "Huisvesting" },
  { label: "Kleine investering", code: 4230, groep: "Kantoor" },
  { label: "Kantoorkosten", code: 4300, groep: "Kantoor" },
  { label: "Computer & software", code: 4330, groep: "Kantoor" },
  { label: "Telefoonkosten", code: 4340, groep: "Kantoor" },
  { label: "Webhosting & internet", code: 4341, groep: "Kantoor" },
  { label: "Portokosten", code: 4350, groep: "Kantoor" },
  { label: "Vakliteratuur", code: 4360, groep: "Kantoor" },
  { label: "Verzekeringen", code: 4400, groep: "Verzekeringen" },
  { label: "Vervoerskosten (OV/auto)", code: 4500, groep: "Vervoer" },
  { label: "Reiskosten (verblijf/buitenland)", code: 4510, groep: "Vervoer" },
  { label: "Parkeerkosten", code: 4520, groep: "Vervoer" },
  { label: "Reclame & marketing", code: 4600, groep: "Marketing" },
  { label: "Representatiekosten", code: 4610, groep: "Marketing" },
  { label: "Website & SEO", code: 4620, groep: "Marketing" },
  { label: "Accountant & advies", code: 4700, groep: "Algemeen" },
  { label: "Boekhouding", code: 4710, groep: "Algemeen" },
  { label: "Juridische kosten", code: 4720, groep: "Algemeen" },
  { label: "Bankkosten", code: 4750, groep: "Algemeen" },
  { label: "Abonnementen & licenties", code: 4800, groep: "Algemeen" },
  { label: "Eten & drinken (zakelijk)", code: 4900, groep: "Overig" },
  { label: "Gereedschap & materiaal", code: 4910, groep: "Overig" },
  { label: "Overige bedrijfskosten", code: 4999, groep: "Overig" },
];

export function getKostensoortByCode(code: number): Kostensoort | undefined {
  return KOSTENSOORTEN.find((k) => k.code === code);
}

export function getGroepen(): string[] {
  const groepen = new Set(KOSTENSOORTEN.map((k) => k.groep));
  return Array.from(groepen);
}

export function getKostensoortenByGroep(groep: string): Kostensoort[] {
  return KOSTENSOORTEN.filter((k) => k.groep === groep);
}
