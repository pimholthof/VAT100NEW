/**
 * UBL 2.1 Invoice XML generator (SI-UBL 2.0 — Nederlandse standaard).
 *
 * Genereert een volledig UBL-document dat voldoet aan de Nederlandse
 * e-facturatie standaard (Simplerinvoicing / Peppol BIS 3.0).
 */

import type { InvoiceData } from "@/lib/types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function vatCategoryCode(vatRate: number): string {
  if (vatRate === 0) return "Z"; // Zero rated
  return "S"; // Standard
}

export function generateUBLInvoice(data: InvoiceData): string {
  const { invoice, lines, client, profile } = data;

  const issueDate = invoice.issue_date;
  const dueDate = invoice.due_date ?? invoice.issue_date;
  const currencyCode = "EUR";
  const isCreditNote = invoice.is_credit_note;
  const docType = isCreditNote ? "CreditNote" : "Invoice";
  const rootTag = isCreditNote ? "CreditNote" : "Invoice";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag}
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:${docType}-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:${isCreditNote ? "CreditNote" : "Invoice"}TypeCode>${isCreditNote ? "381" : "380"}</cbc:${isCreditNote ? "CreditNote" : "Invoice"}TypeCode>
  <cbc:DocumentCurrencyCode>${currencyCode}</cbc:DocumentCurrencyCode>

  <!-- Verkoper -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(profile.studio_name || profile.full_name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        ${profile.address ? `<cbc:StreetName>${escapeXml(profile.address)}</cbc:StreetName>` : ""}
        ${profile.city ? `<cbc:CityName>${escapeXml(profile.city)}</cbc:CityName>` : ""}
        ${profile.postal_code ? `<cbc:PostalZone>${escapeXml(profile.postal_code)}</cbc:PostalZone>` : ""}
        <cac:Country>
          <cbc:IdentificationCode>NL</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${profile.btw_number ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(profile.btw_number)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ""}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(profile.studio_name || profile.full_name)}</cbc:RegistrationName>
        ${profile.kvk_number ? `<cbc:CompanyID schemeID="0106">${escapeXml(profile.kvk_number)}</cbc:CompanyID>` : ""}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Koper -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(client.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        ${client.address ? `<cbc:StreetName>${escapeXml(client.address)}</cbc:StreetName>` : ""}
        ${client.city ? `<cbc:CityName>${escapeXml(client.city)}</cbc:CityName>` : ""}
        ${client.postal_code ? `<cbc:PostalZone>${escapeXml(client.postal_code)}</cbc:PostalZone>` : ""}
        <cac:Country>
          <cbc:IdentificationCode>NL</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${client.btw_number ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(client.btw_number)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ""}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(client.name)}</cbc:RegistrationName>
        ${client.kvk_number ? `<cbc:CompanyID schemeID="0106">${escapeXml(client.kvk_number)}</cbc:CompanyID>` : ""}
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Betaalgegevens -->
  ${profile.iban ? `<cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(profile.iban)}</cbc:ID>
      ${profile.bic ? `<cac:FinancialInstitutionBranch>
        <cbc:ID>${escapeXml(profile.bic)}</cbc:ID>
      </cac:FinancialInstitutionBranch>` : ""}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>` : ""}

  <!-- BTW-totaal -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${formatAmount(invoice.vat_amount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currencyCode}">${formatAmount(invoice.subtotal_ex_vat)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currencyCode}">${formatAmount(invoice.vat_amount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${vatCategoryCode(invoice.vat_rate)}</cbc:ID>
        <cbc:Percent>${invoice.vat_rate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Totalen -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${formatAmount(invoice.subtotal_ex_vat)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currencyCode}">${formatAmount(invoice.subtotal_ex_vat)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyCode}">${formatAmount(invoice.total_inc_vat)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currencyCode}">${formatAmount(invoice.total_inc_vat)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Regels -->
${lines.map((line, index) => `  <cac:${isCreditNote ? "CreditNote" : "Invoice"}Line>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:${isCreditNote ? "CreditedQuantity" : "InvoicedQuantity"} unitCode="C62">${line.quantity}</cbc:${isCreditNote ? "CreditedQuantity" : "InvoicedQuantity"}>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${formatAmount(line.amount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${vatCategoryCode(invoice.vat_rate)}</cbc:ID>
        <cbc:Percent>${invoice.vat_rate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currencyCode}">${formatAmount(line.rate)}</cbc:PriceAmount>
    </cac:Price>
  </cac:${isCreditNote ? "CreditNote" : "Invoice"}Line>`).join("\n")}

</${rootTag}>`;

  return xml;
}
