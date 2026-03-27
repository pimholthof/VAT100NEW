"use client";

import { useState } from "react";
import { ReceiptForm } from "@/features/receipts/components/ReceiptForm";
import { BulkUpload } from "@/features/receipts/components/BulkUpload";
import { PageHeader } from "@/components/ui";

type Mode = "single" | "bulk";

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: active ? "1.5px solid var(--foreground)" : "1.5px solid transparent",
  padding: "8px 0",
  fontSize: "var(--text-label)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  opacity: active ? 1 : 0.35,
  transition: "opacity 0.2s ease",
});

export default function NewReceiptPage() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div>
      <PageHeader
        title="Nieuwe bon"
        titleSize="md"
        backHref="/dashboard/receipts"
        backLabel="Terug naar bonnen"
      />

      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 32,
          borderBottom: "0.5px solid rgba(13,13,11,0.08)",
        }}
      >
        <button
          type="button"
          onClick={() => setMode("single")}
          style={tabStyle(mode === "single")}
        >
          Enkele bon
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          style={tabStyle(mode === "bulk")}
        >
          Meerdere bonnen
        </button>
      </div>

      {mode === "single" ? <ReceiptForm /> : <BulkUpload />}
    </div>
  );
}
