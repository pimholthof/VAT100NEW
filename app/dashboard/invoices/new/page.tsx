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
      <h1 className="font-[family-name:var(--font-display)] text-[var(--text-display-md)] font-bold tracking-[var(--tracking-display)] leading-none mb-8">
        Nieuwe factuur
      </h1>
      <InvoiceForm />
    </div>
  );
}
