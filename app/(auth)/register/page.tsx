"use client";

import { register } from "../actions";
import Link from "next/link";
import { useState } from "react";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-label)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.4,
};

const textInputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "13px",
  fontWeight: 300,
  padding: "12px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(13,13,11,0.12)",
  background: "transparent",
  color: "var(--foreground)",
  outline: "none",
  width: "100%",
};

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;
    const confirm = (
      form.elements.namedItem("confirm_password") as HTMLInputElement
    ).value;

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
          Account aanmaken
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="full_name" style={labelStyle}>Volledige naam</label>
            <input id="full_name" name="full_name" type="text" required autoComplete="name" style={textInputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="studio_name" style={labelStyle}>Studionaam</label>
            <input id="studio_name" name="studio_name" type="text" required placeholder="bijv. Maya Kowalski Studio" autoComplete="organization" style={textInputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="email" style={labelStyle}>E-mailadres</label>
            <input id="email" name="email" type="email" required autoComplete="email" style={{ ...textInputStyle, fontFamily: "var(--font-mono), monospace" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="password" style={labelStyle}>Wachtwoord</label>
            <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" style={textInputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="confirm_password" style={labelStyle}>Wachtwoord bevestigen</label>
            <input id="confirm_password" name="confirm_password" type="password" required minLength={6} autoComplete="new-password" style={textInputStyle} />
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
            {pending ? "Bezig..." : "Registreren"}
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
          Al een account?{" "}
          <Link
            href="/login"
            style={{
              fontWeight: 500,
              color: "var(--foreground)",
              textDecoration: "none",
              opacity: 1,
            }}
          >
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
