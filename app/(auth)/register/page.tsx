"use client";

import { register } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

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
  const plan = searchParams.get("plan");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;

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
            Account aanmaken
          </h1>
        </div>

        {/* Form — flat, no card */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {plan && <input type="hidden" name="plan" value={plan} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="full_name" className="label">Volledige naam</label>
              <input id="full_name" name="full_name" type="text" required autoComplete="name" style={inputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="studio_name" className="label">Bedrijfsnaam</label>
              <input id="studio_name" name="studio_name" type="text" required placeholder="bijv. Maya Kowalski Studio" autoComplete="organization" style={inputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="email" className="label">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="password" className="label">Wachtwoord</label>
                <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="confirm_password" className="label">Bevestigen</label>
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
              {pending ? "Even wachten..." : "Account aanmaken"}
            </button>
          </form>

        <p
          className="label"
          style={{ marginTop: 32, opacity: 0.35 }}
        >
          Al een account?{" "}
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
            Inloggen
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
