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
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr 1fr 1fr", 
      gap: 60, 
      padding: "40px 0",
      borderTop: "var(--border-rule)",
      borderBottom: "var(--border-rule)",
      marginBottom: 80
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">REF</p>
        <input
          type="text"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">DATE</p>
        <input
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="label">TAX ({vatRate}%)</p>
        <select
          value={vatRate}
          onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
          style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13, background: "transparent" }}
        >
          <option value={21}>High (21%)</option>
          <option value={9}>Low (9%)</option>
          <option value={0}>Zero (0%)</option>
        </select>
      </div>
    </div>
  );
}
