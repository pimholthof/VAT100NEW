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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-xl)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.85,
            margin: 0,
          }}
        >
          VAT100
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "13px",
            fontWeight: 300,
            opacity: 0.4,
            marginTop: 16,
            marginBottom: 56,
          }}
        >
          Inloggen
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              htmlFor="email"
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.4,
              }}
            >
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
                padding: "12px 0",
                border: "none",
                borderBottom: "0.5px solid rgba(13,13,11,0.12)",
                background: "transparent",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              htmlFor="password"
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.4,
              }}
            >
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
                padding: "12px 0",
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
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: 18,
              border: "none",
              background: "var(--foreground)",
              color: "var(--background)",
              cursor: "pointer",
              width: "100%",
            }}
          >
            {pending ? "Bezig..." : "Inloggen"}
          </button>
        </form>

        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.3,
            marginTop: 32,
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
            }}
          >
            Registreer
          </Link>
        </p>
      </div>
    </div>
  );
}
