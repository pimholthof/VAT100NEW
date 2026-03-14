"use client";

import { completeOnboarding } from "../actions";
import { useState } from "react";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await completeOnboarding(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>Welkom</h1>
        <p style={styles.subtitle}>Vul je bedrijfsgegevens aan</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label htmlFor="kvk_number" style={styles.label}>
                KVK-NUMMER
              </label>
              <input
                id="kvk_number"
                name="kvk_number"
                type="text"
                required
                pattern="[0-9]{8}"
                title="8 cijfers"
                autoComplete="off"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="btw_number" style={styles.label}>
                BTW-NUMMER
              </label>
              <input
                id="btw_number"
                name="btw_number"
                type="text"
                required
                placeholder="NL000000000B01"
                autoComplete="off"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="address" style={styles.label}>
              ADRES
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              autoComplete="street-address"
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label htmlFor="postal_code" style={styles.label}>
                POSTCODE
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                required
                pattern="[0-9]{4}\s?[A-Za-z]{2}"
                title="bijv. 1234 AB"
                autoComplete="postal-code"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="city" style={styles.label}>
                PLAATS
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                autoComplete="address-level2"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="iban" style={styles.label}>
              IBAN
            </label>
            <input
              id="iban"
              name="iban"
              type="text"
              required
              placeholder="NL00BANK0000000000"
              autoComplete="off"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="bic" style={styles.label}>
              BIC
            </label>
            <input
              id="bic"
              name="bic"
              type="text"
              autoComplete="off"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={pending} style={styles.button}>
            {pending ? "Bezig..." : "Opslaan & doorgaan"}
          </button>
        </form>
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
    fontSize: "var(--text-display-lg)",
    fontWeight: 900,
    letterSpacing: "var(--tracking-display)",
    lineHeight: 1,
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
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
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
    padding: "12px 2px",
    border: "none",
    borderBottom: "var(--border-input)",
    background: "transparent",
    color: "var(--foreground)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
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
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    padding: "14px 16px",
    border: "none",
    background: "var(--foreground)",
    color: "var(--background)",
    cursor: "pointer",
    width: "100%",
  },
};
