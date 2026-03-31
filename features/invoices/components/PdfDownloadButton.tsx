"use client";

import { useEffect, useState } from "react";
import type { InvoiceTemplate } from "@/lib/types";

const STORAGE_KEY = "vat100-invoice-template";

export function PdfDownloadButton({ invoiceId }: { invoiceId: string }) {
  const [template, setTemplate] = useState<InvoiceTemplate>("minimaal");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
    if (saved && ["minimaal", "klassiek", "strak"].includes(saved)) {
      setTemplate(saved);
    }

    function onStorage() {
      const t = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
      if (t) setTemplate(t);
    }
    // Listen for changes from the template picker
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => {
      const t = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
      if (t && t !== template) setTemplate(t);
    }, 500);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  });

  return (
    <a
      href={`/api/invoice/${invoiceId}/pdf?template=${template}`}
      style={{
        fontSize: "var(--text-body-md)",
        fontFamily: "var(--font-body), sans-serif",
        fontWeight: 500,
        color: "var(--foreground)",
        textDecoration: "none",
        letterSpacing: "0.05em",
        padding: "8px 20px",
        border: "var(--border-light)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      Download PDF
    </a>
  );
}
