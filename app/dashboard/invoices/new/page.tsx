"use client";

import { useEffect } from "react";
import { useInvoiceStore } from "@/lib/store/invoice";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";

export default function NewInvoicePage() {
  const resetForm = useInvoiceStore((s) => s.resetForm);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  return (
    <div>
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
        Nieuwe factuur
      </h1>
      <InvoiceForm />
    </div>
  );
}
