import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(32px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        textAlign: "center",
        gap: 24,
      }}
    >
      <p
        className="label"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: 0,
          opacity: 0.35,
        }}
      >
        VAT100
      </p>
      <h1
        style={{
          fontSize: "clamp(2.5rem, 8vw, 4rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          margin: 0,
          maxWidth: "20ch",
        }}
      >
        Geen verbinding
      </h1>
      <p
        style={{
          fontSize: 16,
          fontWeight: 300,
          lineHeight: 1.5,
          maxWidth: "36ch",
          opacity: 0.55,
          margin: 0,
        }}
      >
        Je bent momenteel offline. Zodra je internet hebt, zijn je gegevens weer beschikbaar.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 16,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          textDecoration: "none",
          color: "var(--foreground)",
          borderBottom: "0.5px solid var(--foreground)",
          paddingBottom: 2,
        }}
      >
        Opnieuw proberen
      </Link>
    </main>
  );
}
