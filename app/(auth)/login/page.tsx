"use client";

import { login } from "../actions";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "center",
        justifyItems: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Giant background logo watermark */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -40,
          left: -20,
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "min(14rem, 28vw)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 0.85,
          color: "var(--foreground)",
          opacity: 0.04,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        VAT100
      </div>

      <div style={{ width: "100%", maxWidth: 340, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-hero)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.85,
            margin: 0,
          }}
        >
          VAT
          <br />
          100
        </h1>

        {/* Tagline */}
        <p
          className="label"
          style={{
            marginTop: 24,
            marginBottom: 72,
            letterSpacing: "var(--tracking-caps)",
            opacity: 0.25,
          }}
        >
          Boekhouding voor creatieven
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="email" className="label">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
                fontWeight: 300,
                padding: "14px 0",
                border: "none",
                borderBottom: "0.5px solid rgba(13,13,11,0.12)",
                background: "transparent",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="password" className="label">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "13px",
                fontWeight: 300,
                padding: "14px 0",
                border: "none",
                borderBottom: "0.5px solid rgba(13,13,11,0.12)",
                background: "transparent",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: 16,
                background: "rgba(13,13,11,0.02)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "11px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: 24,
              border: "none",
              background: "var(--foreground)",
              color: "var(--background)",
              cursor: "pointer",
              width: "100%",
              transition: "opacity 0.15s ease",
            }}
          >
            {pending ? "Bezig..." : "Inloggen"}
          </button>
        </form>

        <p
          className="label"
          style={{
            marginTop: 40,
            opacity: 0.2,
          }}
        >
          Nog geen account?{" "}
          <Link
            href="/register"
            style={{
              fontWeight: 500,
              color: "var(--foreground)",
              textDecoration: "none",
              opacity: 1,
              borderBottom: "0.5px solid rgba(13,13,11,0.3)",
              paddingBottom: 1,
            }}
          >
            Registreer
          </Link>
        </p>
      </div>
    </div>
  );
}
