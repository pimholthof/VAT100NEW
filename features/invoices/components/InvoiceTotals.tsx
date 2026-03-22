"use client";

import { useInvoiceStore } from "@/lib/store/invoice";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export function InvoiceTotals() {
  const totals = useInvoiceStore((s) => s.totals);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 100 }}>
      <div>
        <p className="label" style={{ opacity: 0.1, marginBottom: 8 }}>GRAND TOTAL</p>
        <AnimatedNumber 
          value={totals.total} 
          isCurrency={true}
          style={{
            fontSize: "6rem",
            fontWeight: 400,
            lineHeight: 0.8,
            letterSpacing: "-0.06em",
            color: "var(--foreground)"
          }}
        />
      </div>
      <div style={{ textAlign: "right", opacity: 0.4 }}>
        <p className="mono-amount" style={{ fontSize: 11, marginBottom: 4 }}>Sub: {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(totals.subtotal)}</p>
        <p className="mono-amount" style={{ fontSize: 11 }}>Tax: {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(totals.vatAmount)}</p>
      </div>
    </div>
  );
}
