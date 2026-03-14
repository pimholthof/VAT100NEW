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
              VOLLEDIGE NAAM
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
              STUDIONAAM
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
              autoComplete="new-password"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="confirm_password" style={styles.label}>
              WACHTWOORD BEVESTIGEN
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
    maxWidth: 480,
  },
  title: {
    fontFamily: "var(--font-display), sans-serif",
    fontSize: "var(--text-display-md)",
    fontWeight: 900,
    letterSpacing: "var(--tracking-display)",
    lineHeight: 1,
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
    border: "1px solid var(--color-black)",
    borderRadius: 0,
    background: "transparent",
    color: "var(--foreground)",
    outline: "none",
  },
  error: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-sm)",
    fontWeight: 400,
    color: "var(--color-black)",
    margin: 0,
    padding: "12px 16px",
    border: "1px solid var(--color-black)",
  },
  button: {
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 500,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    padding: "14px 16px",
    border: "none",
    borderRadius: 0,
    background: "var(--color-black)",
    color: "var(--color-white)",
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
