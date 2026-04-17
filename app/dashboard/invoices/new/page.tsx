"use client";

import { useEffect } from "react";
import { useInvoiceStore } from "@/lib/store/invoice";
import { InvoiceForm } from "@/features/invoices/components/InvoiceForm";
import { InvoiceLivePreview } from "@/features/invoices/components/InvoiceLivePreview";
import { useLocale } from "@/lib/i18n/context";

export default function NewInvoicePage() {
  const { t } = useLocale();
  const resetForm = useInvoiceStore((s) => s.resetForm);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  return (
    <div className="invoice-edit-layout">
      <div className="invoice-edit-layout__form">
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: "0 0 32px",
          }}
        >
          {t.invoices.newInvoice}
        </h1>
        <InvoiceForm />
      </div>
      <aside
        className="invoice-edit-layout__preview"
        aria-label="Live factuurvoorbeeld"
      >
        <InvoiceLivePreview />
      </aside>
    </div>
  );
}
