"use client";

import Link from "next/link";
import { ClientForm } from "@/components/client/ClientForm";

export default function NewClientPage() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/clients"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            letterSpacing: "0.02em",
            color: "var(--foreground)",
            opacity: 0.6,
            textDecoration: "none",
          }}
        >
          ← Terug naar klanten
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
          Nieuwe klant
        </h1>
      </div>
      <ClientForm />
    </div>
  );
}
