"use client";

import { login } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
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

export default function LoginPage() {
  const searchParams = useSearchParams();
  const isNewAccount = searchParams.get("new_account") === "true";
  const emailParam = searchParams.get("email") || "";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(emailParam || "");
  const { t } = useLocale();

  useEffect(() => {
    if (emailParam && emailParam !== email) setEmail(emailParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam]);

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
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
        padding: "24px 16px",
        background: "var(--background)",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1400' height='520'%3E%3Ctext x='8' y='430' font-family='Helvetica Neue%2CHelvetica%2CArial%2Csans-serif' font-weight='800' font-size='420' letter-spacing='-16' fill='%23000' fill-opacity='0.012'%3EVAT100%3C%2Ftext%3E%3C%2Fsvg%3E\")",
        backgroundRepeat: "repeat",
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

        {/* Form — flat, no card */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {isNewAccount && (
            <div
              style={{
                background: "var(--color-black)",
                color: "white",
                padding: "20px",
                marginBottom: 12,
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                lineHeight: 1.4
              }}
            >
              <div style={{ textTransform: "uppercase", fontSize: "10px", marginBottom: 8, opacity: 0.6 }}>Onboarding</div>
              HOERA! JE ACCOUNT IS ACTIEF.<br/>
              LOG IN OM JE DASHBOARD TE OPENEN.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="email" className="label">{t.auth.email}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label htmlFor="password" className="label">{t.auth.password}</label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: "10px",
                  color: "var(--color-black)",
                  opacity: 0.35,
                  textDecoration: "none",
                  borderBottom: "0.5px solid rgba(0,0,0,0.15)",
                  paddingBottom: 1,
                }}
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
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
            {pending ? t.common.waiting : t.auth.login}
          </button>
        </form>

        <p
          className="label"
          style={{ marginTop: 32, opacity: 0.35 }}
        >
          {t.auth.noAccount}{" "}
          <Link
            href="/register"
            style={{
              fontWeight: 700,
              color: "var(--color-black)",
              textDecoration: "none",
              borderBottom: "0.5px solid rgba(0,0,0,0.25)",
              paddingBottom: 1,
            }}
          >
            {t.auth.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
