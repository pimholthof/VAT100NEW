"use client";

import { InvoiceLineRow } from "./InvoiceLineRow";
import { playSound } from "@/lib/utils/sound";
import type { InvoiceLineInput } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

export function InvoiceLinesSection({
  lines,
  addLine,
  updateLine,
  removeLine,
}: {
  lines: InvoiceLineInput[];
  addLine: () => void;
  updateLine: (
    id: string,
    field: keyof InvoiceLineInput,
    value: string | number
  ) => void;
  removeLine: (id: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div style={{ marginBottom: 80 }}>
      <p className="label" style={{ opacity: 0.2, marginBottom: 24 }}>
        {t.invoices.invoiceLines}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {lines.map((line, index) => (
          <InvoiceLineRow
            key={line.id}
            line={line}
            index={index}
            totalLines={lines.length}
            onUpdate={updateLine}
            onRemove={removeLine}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            addLine();
            playSound("tink");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            textAlign: "left",
            padding: "12px 0",
            opacity: 0.2,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {t.invoices.addLine}
        </button>
      </div>
    </div>
  );
}
