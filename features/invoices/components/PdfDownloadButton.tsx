"use client";

import { useEffect, useState } from "react";
import type { InvoiceTemplate } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

const STORAGE_KEY = "vat100-invoice-template";

export function PdfDownloadButton({ invoiceId }: { invoiceId: string }) {
  const { t } = useLocale();
  const [template, setTemplate] = useState<InvoiceTemplate>("poster");

  useEffect(() => {
    function syncTemplate() {
      const t = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
      if (t && ["minimaal", "klassiek", "strak", "poster", "editoriaal"].includes(t)) {
        setTemplate(t);
      }
    }

    syncTemplate();

    // Listen for cross-tab changes
    window.addEventListener("storage", syncTemplate);
    // Poll for same-tab changes (localStorage.setItem doesn't fire storage in same tab)
    const interval = setInterval(syncTemplate, 300);
    return () => {
      window.removeEventListener("storage", syncTemplate);
      clearInterval(interval);
    };
  }, []);

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
      {t.invoices.downloadPdf}
    </a>
  );
}
