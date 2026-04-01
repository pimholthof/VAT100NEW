"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin]", error);
  }, [error]);

  return (
    <div style={{ padding: "var(--space-section) 0" }}>
      <h2
        className="display-title"
        style={{ marginBottom: 12 }}
      >
        Er is iets misgegaan
      </h2>
      <p className="label" style={{ marginBottom: 32 }}>
        Een onderdeel van het beheerpaneel kon niet worden geladen.
      </p>
      <button className="btn-primary" onClick={reset}>
        Opnieuw proberen
      </button>
    </div>
  );
}
