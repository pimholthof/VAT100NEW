/**
 * BTW-aangifte XML-export voor Belastingdienst (SBR-standaard)
 *
 * Genereert een OB (Omzetbelasting) aangifte in XML-formaat
 * compatible met de Belastingdienst indienings-standaard.
 */

export interface VatReturnXmlData {
  // Bedrijfsgegevens
  btwNumber: string;
  companyName: string;

  // Periode
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD

  // BTW-bedragen
  outputVat21: number;     // Rubriek 1a: Leveringen/diensten belast met 21%
  outputVatBase21: number; // Rubriek 1a basis
  outputVat9: number;      // Rubriek 1b: Leveringen/diensten belast met 9%
  outputVatBase9: number;  // Rubriek 1b basis
  outputVat0: number;      // Rubriek 1e: Leveringen/diensten belast met 0%

  inputVat: number;        // Rubriek 5b: Voorbelasting
  vatDue: number;          // Rubriek 5g: Te betalen/vorderen
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(amount: number): string {
  return Math.round(amount).toString();
}

/**
 * Genereer BTW-aangifte XML in SBR-formaat.
 *
 * De Belastingdienst accepteert XBRL-berichten met het OB-taxonomie.
 * Dit is een vereenvoudigde versie die de kerngegevens bevat.
 */
export function generateVatReturnXml(data: VatReturnXmlData): string {
  const periodYear = data.periodStart.slice(0, 4);
  const startMonth = parseInt(data.periodStart.slice(5, 7), 10);
  const quarter = Math.ceil(startMonth / 3);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:bd-ob="http://www.nltaxonomie.nl/nt/bd/20230101/dictionary/bd-ob"
  xmlns:iso4217="http://www.xbrl.org/2003/iso4217"
  xmlns:link="http://www.xbrl.org/2003/linkbase"
  xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- Context: Aangifteperiode -->
  <xbrli:context id="Msg">
    <xbrli:entity>
      <xbrli:identifier scheme="www.belastingdienst.nl/omzetbelastingnummer">${escapeXml(data.btwNumber)}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:startDate>${data.periodStart}</xbrli:startDate>
      <xbrli:endDate>${data.periodEnd}</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>

  <xbrli:unit id="EUR">
    <xbrli:measure>iso4217:EUR</xbrli:measure>
  </xbrli:unit>

  <!-- Bedrijfsgegevens -->
  <bd-ob:ContactInitials contextRef="Msg">${escapeXml(data.companyName)}</bd-ob:ContactInitials>
  <bd-ob:TaxReturnMessageType contextRef="Msg">OB</bd-ob:TaxReturnMessageType>
  <bd-ob:TaxReturnPeriodYear contextRef="Msg">${periodYear}</bd-ob:TaxReturnPeriodYear>
  <bd-ob:TaxReturnPeriodQuarter contextRef="Msg">${quarter}</bd-ob:TaxReturnPeriodQuarter>

  <!-- Rubriek 1a: Leveringen/diensten belast met hoog tarief (21%) -->
  <bd-ob:TurnoverSuppliesServicesGeneralTariff contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.outputVatBase21)}</bd-ob:TurnoverSuppliesServicesGeneralTariff>
  <bd-ob:ValueAddedTaxSuppliesServicesGeneralTariff contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.outputVat21)}</bd-ob:ValueAddedTaxSuppliesServicesGeneralTariff>

  <!-- Rubriek 1b: Leveringen/diensten belast met laag tarief (9%) -->
  <bd-ob:TurnoverSuppliesServicesReducedTariff contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.outputVatBase9)}</bd-ob:TurnoverSuppliesServicesReducedTariff>
  <bd-ob:ValueAddedTaxSuppliesServicesReducedTariff contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.outputVat9)}</bd-ob:ValueAddedTaxSuppliesServicesReducedTariff>

  <!-- Rubriek 1e: Leveringen/diensten belast met 0% / verlegd -->
  <bd-ob:TurnoverSuppliesServicesOtherRates contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.outputVat0)}</bd-ob:TurnoverSuppliesServicesOtherRates>

  <!-- Rubriek 5b: Voorbelasting -->
  <bd-ob:ValueAddedTaxOnInput contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.inputVat)}</bd-ob:ValueAddedTaxOnInput>

  <!-- Rubriek 5g: Te betalen / Te vorderen -->
  <bd-ob:ValueAddedTaxOwed contextRef="Msg" unitRef="EUR" decimals="0">${formatAmount(data.vatDue)}</bd-ob:ValueAddedTaxOwed>

</xbrli:xbrl>`;

  return xml;
}

/**
 * Valideer de XML data op logische consistentie.
 */
export function validateVatReturnXml(data: VatReturnXmlData): string[] {
  const errors: string[] = [];

  if (!data.btwNumber || !data.btwNumber.startsWith("NL")) {
    errors.push("BTW-nummer moet beginnen met NL");
  }

  if (!data.periodStart || !data.periodEnd) {
    errors.push("Periode start en eind zijn verplicht");
  }

  const totalOutputVat = data.outputVat21 + data.outputVat9;
  const expectedVatDue = totalOutputVat - data.inputVat;
  const diff = Math.abs(expectedVatDue - data.vatDue);
  if (diff > 1) {
    errors.push(`Te betalen BTW (${data.vatDue}) klopt niet met berekening (${expectedVatDue})`);
  }

  if (data.outputVatBase21 < 0 || data.outputVatBase9 < 0) {
    errors.push("Omzet mag niet negatief zijn");
  }

  return errors;
}
