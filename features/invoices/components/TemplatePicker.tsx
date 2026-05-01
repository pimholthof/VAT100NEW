"use client";

import type { InvoiceTemplate } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

export function TemplatePicker({
  value,
  onChange,
}: {
  value: InvoiceTemplate;
  onChange: (t: InvoiceTemplate) => void;
}) {
  const { t } = useLocale();

  const templates: { id: InvoiceTemplate; label: string; desc: string }[] = [
    { id: "poster", label: t.invoices.templatePoster, desc: t.invoices.templatePosterDesc },
    { id: "minimaal", label: t.invoices.templateMinimal, desc: t.invoices.templateMinimalDesc },
    { id: "klassiek", label: t.invoices.templateClassic, desc: t.invoices.templateClassicDesc },
    { id: "strak", label: t.invoices.templateModern, desc: t.invoices.templateModernDesc },
    { id: "editoriaal", label: t.invoices.templateEditorial, desc: t.invoices.templateEditorialDesc },
  ];

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          onClick={() => onChange(tpl.id)}
          title={tpl.desc}
          style={{
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: value === tpl.id ? 600 : 400,
            letterSpacing: "0.02em",
            background: value === tpl.id ? "var(--foreground)" : "transparent",
            color: value === tpl.id ? "var(--background)" : "var(--foreground)",
            border: value === tpl.id ? "1px solid var(--foreground)" : "1px solid rgba(0,0,0,0.12)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {tpl.label}
        </button>
      ))}
    </div>
  );
}
