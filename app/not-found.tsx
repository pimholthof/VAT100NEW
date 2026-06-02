import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pagina niet gevonden — VAT100",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 40,
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <span
        className="label"
        style={{ opacity: 0.35, marginBottom: 24, fontFamily: "var(--font-mono)" }}
      >
        VAT100
      </span>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          margin: "0 0 4px",
          opacity: 0.12,
        }}
      >
        404
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
        Deze pagina bestaat niet
      </h1>
      <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.6, maxWidth: 340, margin: "0 0 28px" }}>
        De pagina is verplaatst of heeft nooit bestaan. Geen zorgen — je
        administratie staat er nog.
      </p>
      <Link href="/" className="btn-primary">
        Naar VAT100
      </Link>
    </div>
  );
}
