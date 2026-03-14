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
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>VAT100</h1>
        <p style={styles.subtitle}>Inloggen</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              E-MAILADRES
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              WACHTWOORD
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={pending} style={styles.button}>
            {pending ? "Bezig..." : "Inloggen"}
          </button>
        </form>

        <p style={styles.footer}>
          Nog geen account?{" "}
          <Link href="/register" style={styles.link}>
            Registreer
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  container: {
    width: "100%",
    maxWidth: 480,
  },
  title: {
    fontFamily: "var(--font-display), sans-serif",
    fontSize: "var(--text-display-lg)",
    fontWeight: 900,
    letterSpacing: "var(--tracking-display)",
    lineHeight: 0.85,
    margin: 0,
  },
  subtitle: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 300,
    margin: "8px 0 40px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "9px",
    fontWeight: 500,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
  },
  input: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 300,
    padding: "12px 16px",
    border: "1px solid var(--foreground)",
    background: "transparent",
    color: "var(--foreground)",
    outline: "none",
  },
  error: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-sm)",
    fontWeight: 400,
    color: "var(--foreground)",
    margin: 0,
    padding: "12px 16px",
    border: "1px solid var(--foreground)",
  },
  button: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 500,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    padding: "14px 16px",
    border: "none",
    background: "var(--foreground)",
    color: "var(--background)",
    cursor: "pointer",
    width: "100%",
  },
  footer: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-md)",
    fontWeight: 300,
    marginTop: 32,
  },
  link: {
    fontWeight: 500,
    color: "var(--foreground)",
    textDecoration: "underline",
  },
};
