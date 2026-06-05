/**
 * Pure import-logica — CSV parsen, kolommen herkennen, waarden normaliseren.
 *
 * Bewust géén `"use server"`: dit is zuivere logica zonder Supabase/Next-
 * afhankelijkheden, zodat het los te testen is. De server-acties in
 * `actions.ts` bouwen hierop voort.
 */

export type ImportType = "invoices" | "receipts" | "clients";

export interface ImportPreview {
  headers: string[];
  mapping: Record<string, string>;
  preview: Record<string, string>[];
  totalRows: number;
}

// ─── CSV parsing ───

/** Parse CSV/TSV met komma- of puntkomma-scheiding en quoted velden. */
export function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === "," || char === ";") {
          fields.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

// ─── Kolom-detectie ───
// Dekt de gangbare exports: Moneybird, e-Boekhouden, Excel — NL + EN koppen.

const INVOICE_COLUMN_MAP: Record<string, string> = {
  factuurnummer: "invoice_number",
  factuurnr: "invoice_number",
  factuur: "invoice_number",
  nummer: "invoice_number",
  invoice_number: "invoice_number",
  "invoice number": "invoice_number",
  klant: "client_name",
  client: "client_name",
  klantnaam: "client_name",
  debiteur: "client_name",
  contact: "client_name",
  relatie: "client_name",
  datum: "issue_date",
  factuurdatum: "issue_date",
  date: "issue_date",
  issue_date: "issue_date",
  "invoice date": "issue_date",
  vervaldatum: "due_date",
  due_date: "due_date",
  "due date": "due_date",
  bedrag: "subtotal_ex_vat",
  "bedrag excl": "subtotal_ex_vat",
  "bedrag excl. btw": "subtotal_ex_vat",
  amount: "subtotal_ex_vat",
  subtotal: "subtotal_ex_vat",
  btw: "vat_amount",
  "btw bedrag": "vat_amount",
  "btw-bedrag": "vat_amount",
  vat: "vat_amount",
  totaal: "total_inc_vat",
  "bedrag incl": "total_inc_vat",
  "bedrag incl. btw": "total_inc_vat",
  total: "total_inc_vat",
  omschrijving: "description",
  description: "description",
  status: "status",
};

const RECEIPT_COLUMN_MAP: Record<string, string> = {
  leverancier: "vendor_name",
  vendor: "vendor_name",
  crediteur: "vendor_name",
  naam: "vendor_name",
  contact: "vendor_name",
  bedrag: "amount_ex_vat",
  "bedrag excl": "amount_ex_vat",
  "bedrag excl. btw": "amount_ex_vat",
  amount: "amount_ex_vat",
  btw: "vat_amount",
  "btw bedrag": "vat_amount",
  "btw-bedrag": "vat_amount",
  vat: "vat_amount",
  totaal: "amount_inc_vat",
  "bedrag incl": "amount_inc_vat",
  "bedrag incl. btw": "amount_inc_vat",
  total: "amount_inc_vat",
  datum: "receipt_date",
  date: "receipt_date",
  bondatum: "receipt_date",
  categorie: "category",
  category: "category",
  omschrijving: "vendor_name",
};

const CLIENT_COLUMN_MAP: Record<string, string> = {
  // Naam / bedrijf
  naam: "name",
  bedrijfsnaam: "name",
  bedrijf: "name",
  klant: "name",
  klantnaam: "name",
  relatie: "name",
  company: "name",
  name: "name",
  "company name": "name",
  // Contactpersoon
  contactpersoon: "contact_name",
  contact: "contact_name",
  "contact name": "contact_name",
  voornaam: "contact_name",
  // E-mail
  email: "email",
  "e-mail": "email",
  emailadres: "email",
  "e-mailadres": "email",
  mail: "email",
  // Adres
  adres: "address",
  adresregel: "address",
  "adresregel 1": "address",
  straat: "address",
  address: "address",
  // Postcode
  postcode: "postal_code",
  "postal code": "postal_code",
  zip: "postal_code",
  // Plaats
  plaats: "city",
  stad: "city",
  woonplaats: "city",
  vestigingsplaats: "city",
  city: "city",
  // Land
  land: "country",
  country: "country",
  // KvK
  kvk: "kvk_number",
  "kvk-nummer": "kvk_number",
  kvknummer: "kvk_number",
  "kvk nummer": "kvk_number",
  // BTW
  btw: "btw_number",
  "btw-nummer": "btw_number",
  btwnummer: "btw_number",
  "btw nummer": "btw_number",
  vat: "btw_number",
  "vat number": "btw_number",
  // Betaaltermijn
  betaaltermijn: "payment_terms_days",
  "betaaltermijn (dagen)": "payment_terms_days",
  payment_terms: "payment_terms_days",
};

const COLUMN_MAPS: Record<ImportType, Record<string, string>> = {
  invoices: INVOICE_COLUMN_MAP,
  receipts: RECEIPT_COLUMN_MAP,
  clients: CLIENT_COLUMN_MAP,
};

/** Doelvelden per importtype — bron voor de UI én de slimme herkenning. */
export const TARGET_FIELDS: Record<ImportType, { field: string; desc: string }[]> = {
  invoices: [
    { field: "invoice_number", desc: "factuurnummer" },
    { field: "client_name", desc: "naam van de klant/debiteur" },
    { field: "issue_date", desc: "factuurdatum" },
    { field: "due_date", desc: "vervaldatum" },
    { field: "subtotal_ex_vat", desc: "bedrag exclusief btw" },
    { field: "vat_amount", desc: "btw-bedrag" },
    { field: "total_inc_vat", desc: "bedrag inclusief btw" },
    { field: "description", desc: "omschrijving" },
    { field: "status", desc: "status (betaald/open)" },
  ],
  receipts: [
    { field: "vendor_name", desc: "leverancier/crediteur" },
    { field: "receipt_date", desc: "datum van de bon" },
    { field: "amount_ex_vat", desc: "bedrag exclusief btw" },
    { field: "vat_amount", desc: "btw-bedrag" },
    { field: "amount_inc_vat", desc: "bedrag inclusief btw" },
    { field: "category", desc: "kostencategorie" },
  ],
  clients: [
    { field: "name", desc: "bedrijfs- of klantnaam" },
    { field: "contact_name", desc: "contactpersoon" },
    { field: "email", desc: "e-mailadres" },
    { field: "address", desc: "straat en huisnummer" },
    { field: "postal_code", desc: "postcode" },
    { field: "city", desc: "plaats/stad" },
    { field: "country", desc: "land" },
    { field: "kvk_number", desc: "kvk-nummer" },
    { field: "btw_number", desc: "btw-nummer" },
    { field: "payment_terms_days", desc: "betaaltermijn in dagen" },
  ],
};

/** Herken bekende kolomkoppen → doelvelden. Eén doelveld hooguit één keer. */
export function detectColumns(
  headers: string[],
  type: ImportType,
): Record<string, string> {
  const map = COLUMN_MAPS[type];
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    const target = map[normalized];
    if (target && !used.has(target)) {
      mapping[header] = target;
      used.add(target);
    }
  }

  return mapping;
}

// ─── Waarde-normalisatie ───

/** Datum → ISO (YYYY-MM-DD). Snapt ISO, DD-MM-YYYY en DD/MM/YYYY. */
export function parseDate(value: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return null;
}

/** Bedrag → number. Snapt NL-notatie (1.234,56) en €-tekens. */
export function parseNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
