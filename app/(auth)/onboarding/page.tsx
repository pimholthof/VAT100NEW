"use client";

import { completeOnboarding } from "../actions";
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
  boxSizing: "border-box",
};

const monoInputStyle: React.CSSProperties = {
  ...textInputStyle,
  fontFamily: "var(--font-mono), monospace",
};

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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.9,
            margin: 0,
          }}
        >
          Welkom
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
          Vul je bedrijfsgegevens aan
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="kvk_number" style={labelStyle}>KVK-nummer</label>
              <input id="kvk_number" name="kvk_number" type="text" required pattern="[0-9]{8}" title="8 cijfers" autoComplete="off" style={monoInputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="btw_number" style={labelStyle}>BTW-nummer</label>
              <input id="btw_number" name="btw_number" type="text" required placeholder="NL000000000B01" autoComplete="off" style={monoInputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="address" style={labelStyle}>Adres</label>
            <input id="address" name="address" type="text" required autoComplete="street-address" style={textInputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="postal_code" style={labelStyle}>Postcode</label>
              <input id="postal_code" name="postal_code" type="text" required pattern="[0-9]{4}\s?[A-Za-z]{2}" title="bijv. 1234 AB" autoComplete="postal-code" style={textInputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="city" style={labelStyle}>Plaats</label>
              <input id="city" name="city" type="text" required autoComplete="address-level2" style={textInputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="iban" style={labelStyle}>IBAN</label>
            <input id="iban" name="iban" type="text" required placeholder="NL00BANK0000000000" autoComplete="off" style={monoInputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="bic" style={labelStyle}>BIC</label>
            <input id="bic" name="bic" type="text" autoComplete="off" style={monoInputStyle} />
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
            {pending ? "Bezig..." : "Opslaan & doorgaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
