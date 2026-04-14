"use client";

import { requestPasswordReset } from "../actions";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/context";

const inputStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  padding: "14px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(0,0,0,0.12)",
  background: "transparent",
  color: "var(--color-black)",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s ease",
};

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { t } = useLocale();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      setSent(true);
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
        padding: "24px 16px",
        background: "var(--background)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1
            style={{
              fontSize: "clamp(4rem, 9vw, 6.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 0.85,
              margin: 0,
              color: "var(--color-black)",
              whiteSpace: "nowrap",
            }}
          >
            VAT100
          </h1>
        </div>

        {sent ? (
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: 1.6,
                margin: "0 0 32px",
                opacity: 0.7,
              }}
            >
              {t.auth.resetLinkSent}
            </p>
            <Link
              href="/login"
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-black)",
                textDecoration: "none",
                borderBottom: "0.5px solid rgba(0,0,0,0.25)",
                paddingBottom: 1,
              }}
            >
              {t.auth.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: 1.6,
                margin: 0,
                opacity: 0.7,
              }}
            >
              {t.auth.forgotPasswordDesc}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="email" className="label">{t.auth.email}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            {error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--color-accent)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-primary"
              style={{ marginTop: 8, width: "100%" }}
            >
              {pending ? t.common.waiting : t.auth.sendResetLink}
            </button>
          </form>
        )}

        <p
          className="label"
          style={{ marginTop: 32, opacity: 0.35 }}
        >
          <Link
            href="/login"
            style={{
              fontWeight: 700,
              color: "var(--color-black)",
              textDecoration: "none",
              borderBottom: "0.5px solid rgba(0,0,0,0.25)",
              paddingBottom: 1,
            }}
          >
            {t.auth.backToLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}
