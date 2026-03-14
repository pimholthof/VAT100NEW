"use client";

import { register } from "../actions";
import Link from "next/link";
import { useState } from "react";

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
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>VAT100</h1>
        <p style={styles.subtitle}>Account aanmaken</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="full_name" style={styles.label}>
              Volledige naam
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="studio_name" style={styles.label}>
              Studionaam
            </label>
            <input
              id="studio_name"
              name="studio_name"
              type="text"
              required
              placeholder="bijv. Maya Kowalski Studio"
              autoComplete="organization"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              E-mailadres
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
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="confirm_password" style={styles.label}>
              Wachtwoord bevestigen
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={pending} style={styles.button}>
            {pending ? "Bezig..." : "Registreren"}
          </button>
        </form>

        <p style={styles.footer}>
          Al een account?{" "}
          <Link href="/login" style={styles.link}>
            Inloggen
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
    maxWidth: 600,
  },
  title: {
    fontFamily: "var(--font-display), sans-serif",
    fontSize: "var(--text-display-xl)",
    fontWeight: 900,
    letterSpacing: "var(--tracking-display)",
    lineHeight: 0.85,
    margin: 0,
  },
  subtitle: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 300,
    margin: "12px 0 56px",
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
    fontSize: "10px",
    fontWeight: 400,
    letterSpacing: "0.02em",
  },
  input: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 300,
    padding: "12px 2px",
    border: "none",
    borderBottom: "var(--border-input)",
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
    border: "none",
    borderLeft: "2px solid var(--foreground)",
  },
  button: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 500,
    letterSpacing: "0.05em",
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
