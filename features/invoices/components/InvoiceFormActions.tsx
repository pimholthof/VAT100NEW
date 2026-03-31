"use client";

import { playSound } from "@/lib/utils/sound";

export function InvoiceFormActions({
  saving,
  onSaveDraft,
  onIssueAndPreview,
}: {
  saving: boolean;
  onSaveDraft: () => void;
  onIssueAndPreview: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 24 }}>
      <button
        onClick={() => {
          onSaveDraft();
          playSound("glass-ping");
        }}
        disabled={saving}
        style={{
          flex: 1,
          padding: "24px",
          background: "rgba(0,0,0,0.03)",
          border: "var(--border-rule)",
          fontSize: 12,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          cursor: "pointer",
        }}
      >
        {saving ? "..." : "Concept opslaan"}
      </button>
      <button
        onClick={() => {
          onIssueAndPreview();
          playSound("glass-ping");
        }}
        disabled={saving}
        style={{
          flex: 2,
          padding: "24px",
          background: "var(--foreground)",
          color: "var(--background)",
          border: "none",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          cursor: "pointer",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
        }}
      >
        {saving ? "..." : "Versturen & Voorbeeld"}
      </button>
    </div>
  );
}
