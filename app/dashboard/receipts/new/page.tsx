"use client";

import Link from "next/link";
import { ReceiptForm } from "@/components/receipt/ReceiptForm";

export default function NewReceiptPage() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/receipts"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-xs)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: "var(--foreground)",
            opacity: 0.6,
            textDecoration: "none",
          }}
        >
          ← Terug naar bonnen
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: "16px 0 0",
          }}
        >
          Nieuwe bon
        </h1>
      </div>
      <ReceiptForm />
    </div>
  );
}
