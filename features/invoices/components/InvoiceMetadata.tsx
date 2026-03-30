"use client";

import { useInvoiceStore } from "@/lib/store/invoice";
import { inputStyle } from "@/components/ui";
import type { VatScheme } from "@/lib/types";

const VAT_OPTIONS: Array<{ value: string; label: string; rate: number; scheme: VatScheme }> = [
  { value: "21_standard", label: "Hoog (21%)", rate: 21, scheme: "standard" },
  { value: "9_standard", label: "Laag (9%)", rate: 9, scheme: "standard" },
  { value: "0_standard", label: "Vrijgesteld (0%)", rate: 0, scheme: "standard" },
  { value: "0_eu_reverse_charge", label: "EU intracommunautair (0%)", rate: 0, scheme: "eu_reverse_charge" },
  { value: "0_export_outside_eu", label: "Buiten EU export (0%)", rate: 0, scheme: "export_outside_eu" },
];

function vatLabel(rate: number, scheme: VatScheme): string {
  if (scheme === "eu_reverse_charge") return "BTW verlegd (EU)";
  if (scheme === "export_outside_eu") return "Geen BTW (export)";
  if (rate === 0) return "BTW vrijgesteld";
  return `BTW (${rate}%)`;
}

export function InvoiceMetadata() {
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
        <p className="label">REFERENTIE</p>
        <input
          type="text"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">DATUM</p>
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
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
