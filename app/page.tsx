"use client";

import { useState } from "react";
import Link from "next/link";
import { joinWaitlist } from "@/features/waitlist/actions";

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

export default function LandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await joinWaitlist(formData);

    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      setPosition(result.data?.position ?? null);
      setSubmitted(true);
      setPending(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background watermark */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: -80,
          right: -60,
          fontSize: "min(28rem, 45vw)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 0.85,
          color: "var(--color-black)",
          opacity: 0.015,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        VAT100
      </div>

      {/* Header */}
      <header
        style={{
          padding: "32px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            color: "var(--color-black)",
          }}
        >
          VAT100
        </span>
        <Link
          href="/login"
          className="label-strong"
          style={{
            textDecoration: "none",
            color: "var(--color-black)",
            padding: "10px 20px",
            border: "0.5px solid rgba(0,0,0,0.15)",
            borderRadius: "var(--radius-sm)",
            transition: "border-color 0.15s ease",
          }}
        >
          Inloggen
        </Link>
      </header>

      {/* Main */}
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 40px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 560, width: "100%" }}>
          {/* Hero */}
          <h1
            style={{
              fontSize: "clamp(3rem, 10vw, 7rem)",
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 0.88,
              margin: 0,
              color: "var(--color-black)",
              whiteSpace: "nowrap",
            }}
          >
            VAT100
          </h1>

          <div style={{ marginTop: 56 }} />

          {/* Waitlist form or success */}
          {submitted ? (
            <div
              style={{
                padding: "32px",
                border: "0.5px solid rgba(0,0,0,0.08)",
                borderRadius: "var(--radius)",
              }}
            >
              <p
                className="label-strong"
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                Je staat op de wachtlijst
              </p>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.5,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {position ? `Je bent nummer ${position}. ` : ""}
                We sturen je een e-mail zodra je toegang krijgt.
              </p>
            </div>
          ) : (
            <div>
              <p
                className="label"
                style={{
                  marginBottom: 20,
                  opacity: 0.3,
                }}
              >
                Schrijf je in voor vroege toegang
              </p>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label
                      htmlFor="name"
                      className="label"
                      style={{ opacity: 0.35, display: "block", marginBottom: 4 }}
                    >
                      Naam
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Je volledige naam"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label
                      htmlFor="email"
                      className="label"
                      style={{ opacity: 0.35, display: "block", marginBottom: 4 }}
                    >
                      E-mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="je@studio.nl"
                      style={inputStyle}
                    />
                  </div>
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
                    padding: "18px 32px",
                    alignSelf: "flex-start",
                  }}
                >
                  {pending ? "Even wachten..." : "Op de wachtlijst"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span className="label" style={{ opacity: 0.2 }}>
          &copy; {new Date().getFullYear()} VAT100
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link
            href="/login"
            className="label"
            style={{
              opacity: 0.2,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            Inloggen
          </Link>
          <Link
            href="/register"
            className="label"
            style={{
              opacity: 0.2,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            Registreren
          </Link>
        </div>
      </footer>
    </div>
  );
}
