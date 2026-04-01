"use client";

import { register } from "../actions";
import { getLeadByToken, initiateLeadPayment } from "@/features/admin/actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { useLocale } from "@/lib/i18n/context";

const inputStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  padding: "14px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(0,0,0,0.12)",
  background: "transparent",
  color: "var(--foreground)",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s ease",
};

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { t } = useLocale();
  const [leadData, setLeadData] = useState<{ id: string, email: string, full_name: string, company_name: string, plan_id: string | null } | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(!!token);

  useEffect(() => {
    if (token) {
      const fetchLead = async () => {
        setIsLoadingToken(true);
        const result = await getLeadByToken(token);
        if (result.data) {
          setLeadData(result.data);
        } else if (result.error) {
          setError(result.error);
        }
        setIsLoadingToken(false);
      };
      fetchLead();
    }
  }, [token]);

  const plan = leadData?.plan_id || searchParams.get("plan");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;

    if (password !== confirm) {
      setError(t.auth.passwordsMismatch);
      return;
    }

    setPending(true);
    const formData = new FormData(form);

    // AUTO-PILOT FLOW: If this is a lead with a token, redirect to Mollie
    if (leadData?.id) {
      const result = await initiateLeadPayment(
        leadData.id,
        plan || "",
        formData.get("full_name") as string,
        formData.get("studio_name") as string,
        password
      );

      if (result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        setError(result.error || "Kon betaallink niet genereren.");
        setPending(false);
      }
      return;
    }

    // REGULAR REGISTRATION FLOW
    const result = await register(formData);

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
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <Link
            href="/login"
            className="label"
            style={{ opacity: 0.3, color: "var(--foreground)", textDecoration: "none" }}
          >
            VAT100
          </Link>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
              margin: "16px 0 12px",
              color: "var(--foreground)",
            }}
          >
            {t.auth.createAccount}
          </h1>
          {leadData && (
            <div style={{ 
              marginTop: "16px", 
              padding: "12px 16px", 
              backgroundColor: "rgba(0,0,0,0.03)", 
              borderLeft: "2px solid var(--color-black)",
              fontSize: "13px"
            }}>
              <span style={{ fontWeight: 700 }}>Welkom terug!</span> We hebben je gegevens van de wachtlijst alvast klaargezet.
            </div>
          )}
          {isLoadingToken && (
            <div style={{ marginTop: "16px", fontSize: "12px", opacity: 0.5 }}>
              Gegevens ophalen...
            </div>
          )}
        </div>

        {/* Form — flat, no card */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {plan && <input type="hidden" name="plan" value={plan} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="full_name" className="label">{t.auth.fullName}</label>
              <input id="full_name" name="full_name" type="text" required autoComplete="name" style={inputStyle} defaultValue={leadData?.full_name || ""} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="studio_name" className="label">{t.auth.companyName}</label>
              <input id="studio_name" name="studio_name" type="text" required placeholder={t.auth.companyNamePlaceholder} autoComplete="organization" style={inputStyle} defaultValue={leadData?.company_name || ""} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="email" className="label">{t.auth.email}</label>
              <input id="email" name="email" type="email" required autoComplete="email" style={inputStyle} defaultValue={leadData?.email || ""} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="password" className="label">{t.auth.password}</label>
                <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="confirm_password" className="label">{t.auth.confirm}</label>
                <input id="confirm_password" name="confirm_password" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                style={{ margin: 0, fontSize: "12px", color: "var(--color-accent)" }}
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
              {pending ? t.common.waiting : (leadData ? "Betalen & Activeren" : t.auth.createAccount)}
            </button>
          </form>

        <p
          className="label"
          style={{ marginTop: 32, opacity: 0.35 }}
        >
          {t.auth.hasAccount}{" "}
          <Link
            href="/login"
            style={{
              fontWeight: 600,
              color: "var(--foreground)",
              textDecoration: "none",
              opacity: 1,
              borderBottom: "0.5px solid rgba(0,0,0,0.25)",
              paddingBottom: 1,
            }}
          >
            {t.auth.login}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
