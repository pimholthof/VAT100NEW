"use client";

import { useState } from "react";
import type { InvoiceData, InvoiceTemplate } from "@/lib/types";
import { InvoiceHTML } from "./InvoiceHTML";
import { TemplatePicker } from "./TemplatePicker";
import { useLocale } from "@/lib/i18n/context";

const STORAGE_KEY = "vat100-invoice-template";

export function InvoicePreviewClient({ data, branded = true, logoUrl = null }: { data: InvoiceData; branded?: boolean; logoUrl?: string | null }) {
  const { locale } = useLocale();
  const [template, setTemplate] = useState<InvoiceTemplate>(() => {
    if (typeof window === "undefined") return "poster";
    const saved = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
    if (saved && ["minimaal", "klassiek", "strak", "poster", "editoriaal"].includes(saved)) {
      return saved;
    }
    return "poster";
  });

  function handleChange(t: InvoiceTemplate) {
    setTemplate(t);
    localStorage.setItem(STORAGE_KEY, t);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "595px",
          display: "flex",
          justifyContent: "flex-start",
          marginBottom: 16,
        }}
      >
        <TemplatePicker value={template} onChange={handleChange} />
      </div>
      <div
        style={{
          border: "var(--border-rule)",
          width: "100%",
          maxWidth: "595px",
          overflowX: "auto",
        }}
      >
        <InvoiceHTML data={data} template={template} locale={locale} branded={branded} logoUrl={logoUrl} />
      </div>
      {/* Hidden link with template param for PDF download */}
      <input type="hidden" id="invoice-template" value={template} />
    </div>
  );
}
