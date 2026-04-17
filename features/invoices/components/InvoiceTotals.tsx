"use client";

import { useLocale } from "@/lib/i18n/context";
import { useInvoiceStore } from "@/lib/store/invoice";
import { formatCurrency } from "@/lib/format";

export function InvoiceTotals() {
  const { t } = useLocale();
  const totals = useInvoiceStore((s) => s.totals);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 100 }}>
      <div>
        <p className="label" style={{ opacity: 0.1, marginBottom: 8 }}>{t.invoices.totalLabel}</p>
        <p
          className="mono-amount"
          style={{
            fontSize: "6rem",
            fontWeight: 400,
            lineHeight: 0.8,
            letterSpacing: "-0.06em",
            color: "var(--foreground)",
            margin: 0,
          }}
        >
          {formatCurrency(totals.total)}
        </p>
      </div>
      <div style={{ textAlign: "right", opacity: 0.4 }}>
        <p className="mono-amount" style={{ fontSize: 11, marginBottom: 4 }}>{t.invoices.exVatLabel} {formatCurrency(totals.subtotal)}</p>
        <p className="mono-amount" style={{ fontSize: 11 }}>{t.invoices.vatAmountLabel} {formatCurrency(totals.vatAmount)}</p>
      </div>
    </div>
  );
}
