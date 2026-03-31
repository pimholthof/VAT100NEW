"use client";

import { useState, useEffect } from "react";
import type { InvoiceData, InvoiceTemplate } from "@/lib/types";
import { InvoiceHTML } from "./InvoiceHTML";
import { TemplatePicker } from "./TemplatePicker";

const STORAGE_KEY = "vat100-invoice-template";

export function InvoicePreviewClient({ data }: { data: InvoiceData }) {
  const [template, setTemplate] = useState<InvoiceTemplate>("minimaal");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
    if (saved && ["minimaal", "klassiek", "strak"].includes(saved)) {
      setTemplate(saved);
    }
  }, []);

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
        <InvoiceHTML data={data} template={template} />
      </div>
      {/* Hidden link with template param for PDF download */}
      <input type="hidden" id="invoice-template" value={template} />
    </div>
  );
}
