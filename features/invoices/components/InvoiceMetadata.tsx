"use client";

import { useLocale } from "@/lib/i18n/context";
import { useInvoiceStore } from "@/lib/store/invoice";
import { inputStyle } from "@/components/ui";
import type { VatScheme } from "@/lib/types";

const VAT_OPTIONS: Array<{ value: string; labelKey: string; rate: number; scheme: VatScheme }> = [
  { value: "21_standard", labelKey: "vatHigh", rate: 21, scheme: "standard" },
  { value: "9_standard", labelKey: "vatLow", rate: 9, scheme: "standard" },
  { value: "0_standard", labelKey: "vatZero", rate: 0, scheme: "standard" },
  { value: "0_eu_reverse_charge", labelKey: "vatEuIntra", rate: 0, scheme: "eu_reverse_charge" },
  { value: "0_export_outside_eu", labelKey: "vatExportOutside", rate: 0, scheme: "export_outside_eu" },
];

export function InvoiceMetadata() {
  const { t } = useLocale();

  function vatLabel(rate: number, scheme: VatScheme): string {
    if (scheme === "eu_reverse_charge") return t.invoices.euReverseCharge;
    if (scheme === "export_outside_eu") return t.invoices.exportOutsideEu;
    if (rate === 0) return t.invoices.vatExempt;
    return t.invoices.vatRateLabel.replace("{rate}", String(rate));
  }
  const invoiceNumber = useInvoiceStore((s) => s.invoiceNumber);
  const setInvoiceNumber = useInvoiceStore((s) => s.setInvoiceNumber);
  const issueDate = useInvoiceStore((s) => s.issueDate);
  const setIssueDate = useInvoiceStore((s) => s.setIssueDate);
  const vatRate = useInvoiceStore((s) => s.vatRate);
  const vatScheme = useInvoiceStore((s) => s.vatScheme);
  const setVatRate = useInvoiceStore((s) => s.setVatRate);
  const setVatScheme = useInvoiceStore((s) => s.setVatScheme);

  const currentValue = `${vatRate}_${vatScheme}`;

  const handleVatChange = (value: string) => {
    const option = VAT_OPTIONS.find((o) => o.value === value);
    if (!option) return;
    if (option.scheme !== vatScheme) {
      setVatScheme(option.scheme);
    }
    if (option.rate !== vatRate) {
      setVatRate(option.rate as 0 | 9 | 21);
    }
  };

  return (
    <div
      className="responsive-grid-3"
      style={{
        gap: 60,
        padding: "40px 0",
        borderTop: "var(--border-rule)",
        borderBottom: "var(--border-rule)",
        marginBottom: 80
      }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">{t.invoices.referenceLabel}</p>
        <input
          type="text"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">{t.invoices.dateLabel}</p>
        <input
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">{vatLabel(vatRate, vatScheme)}</p>
        <select
          value={currentValue}
          onChange={(e) => handleVatChange(e.target.value)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13, background: "transparent" }}
        >
          {VAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t.invoices[opt.labelKey as keyof typeof t.invoices]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
