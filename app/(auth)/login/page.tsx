"use client";

import { login } from "../actions";
import Link from "next/link";
import { useState } from "react";

const inputStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 400,
  padding: "14px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(0,0,0,0.1)",
  background: "transparent",
  color: "var(--color-black)",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s ease",
};

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
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "center",
        justifyItems: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background watermark */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -60,
          right: -40,
          fontSize: "min(20rem, 35vw)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 0.85,
          color: "var(--color-black)",
          opacity: 0.02,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        VAT100
      </div>

      <div style={{ width: "100%", maxWidth: 320, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <h1
          style={{
            fontSize: "clamp(4rem, 12vw, 8rem)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 0.85,
            margin: 0,
            color: "var(--color-black)",
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
            marginTop: 20,
            marginBottom: 64,
            opacity: 0.3,
          }}
        >
          Boekhouding zonder gedoe
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="email" className="label" style={{ opacity: 0.35 }}>
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="password" className="label" style={{ opacity: 0.35 }}>
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                background: "rgba(165, 28, 48, 0.04)",
                borderLeft: "2px solid var(--color-accent)",
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
            style={{
              padding: "20px",
              width: "100%",
            }}
          >
            {pending ? "Even wachten..." : "Inloggen"}
          </button>
        </form>

        <p
          className="label"
          style={{
            marginTop: 40,
            opacity: 0.3,
          }}
        >
          Nog geen account?{" "}
          <Link
            href="/register"
            style={{
              fontWeight: 600,
              color: "var(--color-black)",
              textDecoration: "none",
              opacity: 1,
              borderBottom: "0.5px solid rgba(0,0,0,0.2)",
              paddingBottom: 1,
            }}
          >
            Registreren
          </Link>
        </p>
      </div>
    </div>
  );
}
