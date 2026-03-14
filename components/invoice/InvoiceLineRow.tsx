"use client";

import type { InvoiceLineInput, InvoiceUnit } from "@/lib/types";

interface InvoiceLineRowProps {
  line: InvoiceLineInput;
  index: number;
  totalLines: number;
  onUpdate: (id: string, field: keyof InvoiceLineInput, value: string | number) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

const units: { value: InvoiceUnit; label: string }[] = [
  { value: "uren", label: "Uren" },
  { value: "dagen", label: "Dagen" },
  { value: "stuks", label: "Stuks" },
];

export function InvoiceLineRow({
  line,
  index,
  totalLines,
  onUpdate,
  onRemove,
  onMove,
}: InvoiceLineRowProps) {
  const amount = Math.round(line.quantity * line.rate * 100) / 100;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 80px 90px 100px 100px 60px",
        gap: 8,
        marginBottom: 4,
      }}
    >
      <input
        type="text"
        value={line.description}
        onChange={(e) => onUpdate(line.id, "description", e.target.value)}
        placeholder="Omschrijving"
        style={cellInputStyle}
      />
      <input
        type="number"
        value={line.quantity}
        onChange={(e) =>
          onUpdate(line.id, "quantity", parseFloat(e.target.value) || 0)
        }
        min={0}
        step={0.5}
        style={cellInputStyle}
      />
      <select
        value={line.unit}
        onChange={(e) => onUpdate(line.id, "unit", e.target.value)}
        style={cellInputStyle}
      >
        {units.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={line.rate}
        onChange={(e) =>
          onUpdate(line.id, "rate", parseFloat(e.target.value) || 0)
        }
        min={0}
        step={0.01}
        style={cellInputStyle}
      />
      <div
        style={{
          ...cellInputStyle,
          background: "transparent",
          border: "1px solid transparent",
          display: "flex",
          alignItems: "center",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 400,
        }}
      >
        {new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
        }).format(amount)}
      </div>
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => onMove(line.id, "up")}
          disabled={index === 0}
          style={iconBtnStyle}
          title="Omhoog"
        >
          &#8593;
        </button>
        <button
          type="button"
          onClick={() => onMove(line.id, "down")}
          disabled={index === totalLines - 1}
          style={iconBtnStyle}
          title="Omlaag"
        >
          &#8595;
        </button>
        <button
          type="button"
          onClick={() => onRemove(line.id)}
          disabled={totalLines <= 1}
          style={{
            ...iconBtnStyle,
            opacity: totalLines <= 1 ? 0.3 : 0.6,
          }}
          title="Verwijder"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--foreground)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-sm)",
  fontWeight: 300,
  outline: "none",
};

const iconBtnStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
