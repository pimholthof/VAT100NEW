"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Let op: global-error vervangt de root-layout volledig, dus hier geen
// app-CSS/tokens — alleen inline styles met letterlijke kleuren uit het palet.
const INK = "#1a1a19";
const PAPER = "#f4f3f1";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="nl">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background: PAPER,
            color: INK,
            fontFamily: "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            padding: 40,
          }}
        >
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 700,
              letterSpacing: "0.18em",
              fontSize: 12,
              opacity: 0.35,
              marginBottom: 28,
            }}
          >
            VAT100
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            Er ging iets onverwachts mis
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.6, maxWidth: 360, margin: "0 0 28px" }}>
            We zijn automatisch op de hoogte gebracht en kijken ernaar. Probeer het
            opnieuw — meestal is het zo opgelost.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                fontSize: 14,
                fontWeight: 500,
                padding: "11px 20px",
                border: "none",
                borderRadius: 8,
                background: INK,
                color: PAPER,
                cursor: "pointer",
              }}
            >
              Probeer opnieuw
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                fontSize: 14,
                fontWeight: 500,
                padding: "11px 20px",
                border: "1px solid rgba(26,26,25,0.2)",
                borderRadius: 8,
                background: "transparent",
                color: INK,
                cursor: "pointer",
              }}
            >
              Naar VAT100
            </button>
          </div>
          {error.digest && (
            <p style={{ fontSize: 12, opacity: 0.3, marginTop: 28 }}>Foutcode: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
