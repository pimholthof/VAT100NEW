"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  checkInvoiceNumberExists,
  generateInvoiceNumber,
} from "@/features/invoices/actions";
import type { VatScheme } from "@/lib/types";

const VAT_OPTIONS: Array<{ value: string; labelKey: string; rate: number; scheme: VatScheme }> = [
  { value: "21_standard", labelKey: "vatHigh", rate: 21, scheme: "standard" },
  { value: "9_standard", labelKey: "vatLow", rate: 9, scheme: "standard" },
  { value: "0_standard", labelKey: "vatZero", rate: 0, scheme: "standard" },
  { value: "0_eu_reverse_charge", labelKey: "vatEuIntra", rate: 0, scheme: "eu_reverse_charge" },
  { value: "0_export_outside_eu", labelKey: "vatExportOutside", rate: 0, scheme: "export_outside_eu" },
];

export function InvoiceMetadata({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const { t } = useLocale();
  const params = useParams<{ id?: string }>();
  const invoiceId = params?.id;
  const [numberConflict, setNumberConflict] = useState(false);
  const [checkingNumber, setCheckingNumber] = useState(false);

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
  const isAutoLocked = vatScheme === "eu_reverse_charge" || vatScheme === "export_outside_eu";

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
      style={{
        borderTop: "var(--border-rule)",
        borderBottom: "var(--border-rule)",
        marginBottom: 80,
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "16px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "var(--text-label)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 600,
          opacity: 0.4,
          color: "var(--foreground)",
        }}
      >
        <span>
          {collapsed
            ? `${invoiceNumber} · ${issueDate} · ${vatLabel(vatRate, vatScheme)}`
            : t.invoices.referenceLabel + " & BTW"}
        </span>
        <span style={{ fontSize: 12, transition: "transform 0.2s ease", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}>
          ▾
        </span>
      </button>

      {!collapsed && (
        <div
          className="responsive-grid-3"
          style={{
            gap: 60,
            padding: "0 0 40px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="label">{t.invoices.referenceLabel}</p>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => {
                setInvoiceNumber(e.target.value);
                if (numberConflict) setNumberConflict(false);
              }}
              onBlur={async () => {
                const trimmed = invoiceNumber.trim();
                if (!trimmed) return;
                setCheckingNumber(true);
                const res = await checkInvoiceNumberExists(trimmed, invoiceId);
                setCheckingNumber(false);
                if (res.error === null) setNumberConflict(!!res.data);
              }}
              aria-invalid={numberConflict || undefined}
              aria-describedby={numberConflict ? "invoice-number-conflict" : undefined}
              className="form-input"
              style={{
                border: "none",
                padding: 0,
                opacity: 0.6,
                fontSize: 13,
                color: numberConflict ? "var(--color-accent)" : undefined,
              }}
            />
            {checkingNumber && (
              <span style={{ fontSize: 11, opacity: 0.35 }}>Controleren…</span>
            )}
            {numberConflict && (
              <span
                id="invoice-number-conflict"
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  fontSize: 11,
                  color: "var(--color-accent)",
                  lineHeight: 1.45,
                }}
              >
                Nummer is al in gebruik.
                <button
                  type="button"
                  onClick={async () => {
                    const res = await generateInvoiceNumber();
                    if (res.error === null && res.data) {
                      setInvoiceNumber(res.data);
                      setNumberConflict(false);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--foreground)",
                    textDecoration: "underline",
                  }}
                >
                  Genereer een nieuw nummer
                </button>
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="label">{t.invoices.dateLabel}</p>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="form-input"
              style={{ border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="label">{vatLabel(vatRate, vatScheme)}</p>
            {isAutoLocked ? (
              <span
                className="form-input"
                style={{
                  border: "none",
                  padding: 0,
                  opacity: 0.4,
                  fontSize: 13,
                  fontStyle: "italic",
                }}
              >
                {vatLabel(vatRate, vatScheme)} — automatisch toegepast
              </span>
            ) : (
              <select
                value={currentValue}
                onChange={(e) => handleVatChange(e.target.value)}
                className="form-input"
                style={{ border: "none", padding: 0, opacity: 0.6, fontSize: 13, background: "transparent" }}
              >
                {VAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t.invoices[opt.labelKey as keyof typeof t.invoices]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
