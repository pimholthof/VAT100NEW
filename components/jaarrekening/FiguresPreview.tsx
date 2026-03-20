"use client";

import type { AnnualFigures } from "@/lib/annual-account/types";
import { formatCurrency } from "@/lib/format";

interface FiguresPreviewProps {
  figures: AnnualFigures;
}

export function FiguresPreview({ figures }: FiguresPreviewProps) {
  const lines = [
    { label: "Omzet", value: figures.revenue.total },
    { label: "Kosten", value: figures.expensesTotal },
    { label: "Afschrijving", value: figures.depreciationTotal },
  ];

  return (
    <div style={{ padding: "24px 0" }}>
      {lines.map((line) => (
        <div
          key={line.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "6px 0",
          }}
        >
          <span className="label" style={{ margin: 0 }}>
            {line.label}
          </span>
          <span
            className="mono-amount"
            style={{ fontSize: 14, fontWeight: 500 }}
          >
            {formatCurrency(line.value)}
          </span>
        </div>
      ))}

      <div
        style={{
          borderTop: "var(--border-sub)",
          margin: "8px 0",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "6px 0",
        }}
      >
        <span className="label" style={{ margin: 0, fontWeight: 600 }}>
          Resultaat
        </span>
        <span
          className="mono-amount"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: figures.result >= 0 ? "var(--vat-olive)" : "var(--color-reserved)",
          }}
        >
          {formatCurrency(figures.result)}
        </span>
      </div>

      <div style={{ height: 16 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "6px 0",
        }}
      >
        <span className="label" style={{ margin: 0 }}>
          Eigen vermogen
        </span>
        <span
          className="mono-amount"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          {formatCurrency(figures.balanceSheet.liabilities.equity)}
        </span>
      </div>
    </div>
  );
}
