"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            padding: 40,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderLeft: "2px solid #0D0D0B",
              fontSize: "14px",
              marginBottom: 24,
            }}
          >
            {error.message || "Er is een fout opgetreden."}
          </div>
          <button
            onClick={reset}
            style={{
              fontSize: "14px",
              fontWeight: 500,
              padding: "10px 16px",
              border: "1px solid rgba(13, 13, 11, 0.2)",
              background: "transparent",
              color: "#0D0D0B",
              cursor: "pointer",
            }}
          >
            Probeer opnieuw
          </button>
        </div>
      </body>
    </html>
  );
}
