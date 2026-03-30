"use client";

import { useEffect } from "react";
import { useQuoteStore } from "@/lib/store/quote";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";

export default function NewQuotePage() {
  const resetForm = useQuoteStore((s) => s.resetForm);

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
        Nieuwe offerte
      </h1>
      <QuoteForm />
    </div>
  );
}
