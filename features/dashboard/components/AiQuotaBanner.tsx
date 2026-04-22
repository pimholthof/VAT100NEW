"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAiQuotaStatus, type AiQuotaStatus } from "@/lib/ai/quota";

/**
 * Subtiele banner die alleen verschijnt als de gebruiker >80% van zijn
 * OCR- of chat-quota heeft verbruikt. Voorkomt "onverwachte" limiet-
 * fouten en triggert upgrades voordat de pijn komt.
 */
export function AiQuotaBanner() {
  const [status, setStatus] = useState<AiQuotaStatus | null>(null);

  useEffect(() => {
    getAiQuotaStatus().then((result) => {
      if (result.data) setStatus(result.data);
    });
  }, []);

  if (!status) return null;

  const ocrPct =
    status.ocrLimit && status.ocrLimit > 0
      ? status.ocrUsed / status.ocrLimit
      : 0;
  const chatPct =
    status.chatLimit && status.chatLimit > 0
      ? status.chatUsed / status.chatLimit
      : 0;

  const warnings: string[] = [];
  if (status.ocrLimit !== null && ocrPct >= 0.8) {
    warnings.push(
      `Bonnen scannen: ${status.ocrUsed}/${status.ocrLimit} deze maand`,
    );
  }
  if (status.chatLimit !== null && chatPct >= 0.8) {
    warnings.push(
      `AI-chat: ${status.chatUsed}/${status.chatLimit} deze maand`,
    );
  }

  if (warnings.length === 0) return null;

  const nearlyOut = ocrPct >= 1 || chatPct >= 1;

  return (
    <div
      role="status"
      style={{
        marginBottom: 24,
        padding: "14px 20px",
        border: `0.5px solid ${nearlyOut ? "var(--color-accent, #A51C30)" : "rgba(0,0,0,0.1)"}`,
        background: nearlyOut ? "rgba(165,28,48,0.03)" : "rgba(0,0,0,0.02)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <p
          className="label"
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: nearlyOut ? 0.8 : 0.5,
            color: nearlyOut ? "var(--color-accent, #A51C30)" : "inherit",
          }}
        >
          {nearlyOut ? "AI-limiet bereikt" : "Bijna aan je AI-limiet"}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55 }}>
          {warnings.join(" · ")}
        </p>
      </div>
      <Link
        href="/dashboard/settings/abonnement"
        style={{
          padding: "8px 16px",
          background: "var(--foreground)",
          color: "var(--background)",
          textDecoration: "none",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Upgrade naar Plus
      </Link>
    </div>
  );
}
