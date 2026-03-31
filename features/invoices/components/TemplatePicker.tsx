"use client";

import type { InvoiceTemplate } from "@/lib/types";

const templates: { id: InvoiceTemplate; label: string; desc: string }[] = [
  { id: "minimaal", label: "Minimaal", desc: "VAT100 huisstijl" },
  { id: "klassiek", label: "Klassiek", desc: "Professioneel & clean" },
  { id: "strak", label: "Strak", desc: "Ultra minimal" },
];

export function TemplatePicker({
  value,
  onChange,
}: {
  value: InvoiceTemplate;
  onChange: (t: InvoiceTemplate) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          title={t.desc}
          style={{
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: value === t.id ? 600 : 400,
            letterSpacing: "0.02em",
            background: value === t.id ? "var(--foreground)" : "transparent",
            color: value === t.id ? "var(--background)" : "var(--foreground)",
            border: value === t.id ? "1px solid var(--foreground)" : "1px solid rgba(0,0,0,0.12)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
