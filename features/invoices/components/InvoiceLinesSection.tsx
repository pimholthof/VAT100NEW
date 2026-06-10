"use client";

import { InvoiceLineRow } from "./InvoiceLineRow";
import { playSound } from "@/lib/utils/sound";
import type { InvoiceLineInput } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";
import { FieldError } from "@/components/ui";

export function InvoiceLinesSection({
  lines,
  addLine,
  updateLine,
  removeLine,
  error,
}: {
  lines: InvoiceLineInput[];
  addLine: () => void;
  updateLine: (
    id: string,
    field: keyof InvoiceLineInput,
    value: string | number
  ) => void;
  removeLine: (id: string) => void;
  error?: string | null;
}) {
  const { t } = useLocale();
  return (
    <div style={{ marginBottom: 80 }}>
      <p className="label" style={{ marginBottom: 24 }}>
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
          className="btn-ghost"
          onClick={() => {
            addLine();
            playSound("tink");
          }}
        >
          {t.invoices.addLine}
        </button>
        {error && <FieldError>{error}</FieldError>}
      </div>
    </div>
  );
}
