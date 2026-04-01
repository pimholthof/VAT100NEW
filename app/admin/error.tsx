"use client";

import { AdminStatePanel } from "./AdminStatePanel";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="admin-layout">
      <AdminStatePanel
        eyebrow="Admin fout"
        title="Er is iets misgegaan"
        description={error.message || "Een onderdeel van het beheerpaneel kon niet worden geladen."}
        actions={[{ href: "/dashboard", label: "Terug naar dashboard", variant: "secondary" }]}
      />
      <div className="admin-inline-actions">
        <button type="button" onClick={reset} className="admin-page-button">
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
