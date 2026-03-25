"use client";

import { useInvoiceStore } from "@/lib/store/invoice";
import { inputStyle } from "@/components/ui";
import type { VatRate } from "@/lib/types";

export function InvoiceMetadata() {
  const invoiceNumber = useInvoiceStore((s) => s.invoiceNumber);
  const setInvoiceNumber = useInvoiceStore((s) => s.setInvoiceNumber);
  const issueDate = useInvoiceStore((s) => s.issueDate);
  const setIssueDate = useInvoiceStore((s) => s.setIssueDate);
  const vatRate = useInvoiceStore((s) => s.vatRate);
  const setVatRate = useInvoiceStore((s) => s.setVatRate);

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
        <p className="label">BTW ({vatRate}%)</p>
        <select
          value={vatRate}
          onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13, background: "transparent" }}
        >
          <option value={21}>Hoog (21%)</option>
          <option value={9}>Laag (9%)</option>
          <option value={0}>Vrijgesteld (0%)</option>
        </select>
      </div>
    </div>
  );
}
