"use client";

import { useState, useTransition } from "react";
import { fileBtwViaDigipoort } from "@/features/tax/digipoort-actions";
import type { QuarterStats } from "@/features/tax/actions";

interface DigipoortSubmitButtonProps {
  quarter: QuarterStats;
}

/**
 * Plus-tier knop: BTW-aangifte rechtstreeks indienen bij de Belastingdienst
 * via Digipoort. Lagere tiers krijgen een upgrade-prompt terug.
 */
export function DigipoortSubmitButton({ quarter }: DigipoortSubmitButtonProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { status: "success"; reference: string | null } | { status: "error"; message: string } | null
  >(null);

  async function handleSubmit() {
    setResult(null);
    startTransition(async () => {
      const [quarterNum, yearStr] = quarter.quarter.split(" ");
      const response = await fileBtwViaDigipoort({
        filingType: "btw_aangifte",
        period: `${yearStr}${quarterNum}`,
        rubrieken: {
          Rubriek1aOmzetBelastingHoog: Math.round(quarter.outputVat * 100),
          Rubriek5aVerschuldigdeOmzetbelasting: Math.round(quarter.outputVat * 100),
          Rubriek5bVoorbelasting: Math.round(quarter.inputVat * 100),
          Rubriek5gTotaalTeBetalenTerugTeVragen: Math.round(quarter.netVat * 100),
        },
      });

      if (response.error) {
        setResult({ status: "error", message: response.error });
      } else if (response.data) {
        setResult({ status: "success", reference: response.data.reference });
      }
    });
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button
        onClick={handleSubmit}
        disabled={pending}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: pending ? "default" : "pointer",
          fontSize: 12,
          opacity: pending ? 0.3 : 0.8,
          color: "inherit",
          letterSpacing: "0.04em",
        }}
        title="Rechtstreeks indienen via Digipoort (Plus)"
      >
        {pending ? "Bezig..." : "Digipoort ↗"}
      </button>
      {result?.status === "success" && (
        <span style={{ fontSize: 10, opacity: 0.6 }}>
          Ingediend · {result.reference ?? "geen kenmerk"}
        </span>
      )}
      {result?.status === "error" && (
        <span style={{ fontSize: 10, color: "var(--color-accent)", maxWidth: 240 }}>
          {result.message}
        </span>
      )}
    </div>
  );
}
