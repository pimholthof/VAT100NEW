"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" style={{ padding: "48px 0" }}>
      <div
        style={{
          padding: "12px 16px",
          borderLeft: "2px solid var(--foreground)",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-md)",
          fontWeight: 400,
          marginBottom: 24,
        }}
      >
        {error.message || "Er is een fout opgetreden."}
      </div>
      <button
        onClick={reset}
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-md)",
          fontWeight: 500,
          letterSpacing: "0.05em",
          padding: "10px 16px",
          border: "1px solid rgba(13, 13, 11, 0.2)",
          background: "transparent",
          color: "var(--foreground)",
          cursor: "pointer",
        }}
      >
        Probeer opnieuw
      </button>
    </div>
  );
}
