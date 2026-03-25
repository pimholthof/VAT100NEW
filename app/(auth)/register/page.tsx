"use client";

import { register } from "../actions";
import Link from "next/link";
import { useState } from "react";

const inputStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 400,
  padding: "14px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(0,0,0,0.1)",
  background: "transparent",
  color: "var(--foreground)",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s ease",
};

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;

    if (password !== confirm) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setPending(true);
    const formData = new FormData(form);
    const result = await register(formData);

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
          color: "var(--foreground)",
          opacity: 0.02,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        VAT100
      </div>

      <div style={{ width: "100%", maxWidth: 320, position: "relative", zIndex: 1 }}>
        <h1
          style={{
            fontSize: "clamp(3rem, 10vw, 6rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 0.85,
            margin: 0,
          }}
        >
          Systeem
          <br />Toegang
        </h1>
        <p
          className="label"
          style={{
            marginTop: 20,
            marginBottom: 64,
            opacity: 0.3,
          }}
        >
          Start je dossier
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="full_name" className="label" style={{ opacity: 0.35 }}>Volledige naam</label>
            <input id="full_name" name="full_name" type="text" required autoComplete="name" style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="studio_name" className="label" style={{ opacity: 0.35 }}>Studionaam</label>
            <input id="studio_name" name="studio_name" type="text" required placeholder="bijv. Studio Kowalski" autoComplete="organization" style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="email" className="label" style={{ opacity: 0.35 }}>E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="password" className="label" style={{ opacity: 0.35 }}>Wachtwoord</label>
            <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="confirm_password" className="label" style={{ opacity: 0.35 }}>Wachtwoord bevestigen</label>
            <input id="confirm_password" name="confirm_password" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
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
            {pending ? "Systeem configureren..." : "Account Aanmaken"}
          </button>
        </form>

        <p
          className="label"
          style={{
            marginTop: 40,
            opacity: 0.3,
          }}
        >
          Al een dossier?{" "}
          <Link
            href="/login"
            style={{
              fontWeight: 600,
              color: "var(--foreground)",
              textDecoration: "none",
              opacity: 1,
              borderBottom: "0.5px solid rgba(0,0,0,0.2)",
              paddingBottom: 1,
            }}
          >
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
