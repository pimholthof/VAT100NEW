"use client";

import { useState } from "react";
import { joinWaitlist } from "./actions/waitlist";

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

export function WaitlistForm() {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("loading");

    const formData = new FormData(e.currentTarget);
    const result = await joinWaitlist(formData);

    if (result.success) {
      setState("success");
    } else {
      setError(result.error);
      setState("idle");
    }
  }

  if (state === "success") {
    return (
      <div style={{ padding: "32px 0 8px" }}>
        <p
          style={{
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--color-black)",
            margin: 0,
          }}
        >
          Je staat op de lijst.
        </p>
        <p
          className="label"
          style={{
            marginTop: 12,
            opacity: 0.4,
          }}
        >
          We sturen je een e-mail zodra VAT100 live gaat.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="waitlist-email" className="label" style={{ opacity: 0.35 }}>
          E-mailadres
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="jouw@email.nl"
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
        disabled={state === "loading"}
        className="btn-primary"
        style={{
          padding: "20px",
          width: "100%",
        }}
      >
        {state === "loading" ? "Even wachten..." : "Ik doe mee"}
      </button>
    </form>
  );
}
