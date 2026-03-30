"use client";

import { memo } from "react";
import type { InvoiceLineInput, InvoiceUnit } from "@/lib/types";
import { playSound } from "@/lib/utils/sound";
import { calculateInvoiceLineAmount } from "@/lib/logic/invoice-calculations";
import { formatCurrency } from "@/lib/format";

interface InvoiceLineRowProps {
  line: InvoiceLineInput;
  index: number;
  totalLines: number;
  onUpdate: (id: string, field: keyof InvoiceLineInput, value: string | number) => void;
  onRemove: (id: string) => void;
}

const units: { value: InvoiceUnit; label: string }[] = [
  { value: "uren", label: "Uren" },
  { value: "dagen", label: "Dagen" },
  { value: "stuks", label: "Stuks" },
];

export const InvoiceLineRow = memo(function InvoiceLineRow({
  line,
  totalLines,
  onUpdate,
  onRemove,
}: InvoiceLineRowProps) {
  const amount = calculateInvoiceLineAmount(line);

  return (
    <div
      className="invoice-line-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 140px 100px",
        gap: 24,
        alignItems: "center",
        padding: "16px 0",
        borderBottom: "var(--border-rule)"
      }}
    >
      <input
        type="text"
        value={line.description}
        onChange={(e) => onUpdate(line.id, "description", e.target.value)}
        placeholder="Omschrijving"
        style={{ ...cellInputStyle, fontSize: 14, fontWeight: 400 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          value={line.quantity}
          min="0"
          step="0.5"
          onChange={(e) =>
            onUpdate(line.id, "quantity", parseFloat(e.target.value) || 0)
          }
          style={{ ...cellInputStyle, textAlign: "right", width: 40 }}
        />
        <select
          value={line.unit}
          onChange={(e) => onUpdate(line.id, "unit", e.target.value)}
          style={{ ...cellInputStyle, opacity: 0.3, width: "auto" }}
        >
          {units.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label.toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ opacity: 0.2, fontSize: 10 }}>@</span>
        <input
          type="number"
          value={line.rate}
          min="0"
          step="0.01"
          onChange={(e) =>
            onUpdate(line.id, "rate", parseFloat(e.target.value) || 0)
          }
          style={{ ...cellInputStyle, textAlign: "right" }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(amount)}
        </div>
        <button
          type="button"
          onClick={() => {
            onRemove(line.id);
            playSound("tink");
          }}
          disabled={totalLines <= 1}
          style={{
            ...iconBtnStyle,
            opacity: totalLines <= 1 ? 0 : 0.2,
          }}
        >
          &#10005;
        </button>
      </div>
    </div>
  );
});

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  padding: 0,
  border: "none",
  borderBottom: "none",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: "var(--text-body-sm)",
  fontWeight: 400,
  outline: "none",
};

const iconBtnStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
  fontSize: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0.3,
};
