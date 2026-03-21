"use client";

import { login } from "../actions";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    <div className="auth-container">
      <div aria-hidden="true" className="auth-watermark">
        VAT100
      </div>

      <div className="auth-form-wrapper">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold tracking-[var(--tracking-display)] leading-[0.85] m-0">
          VAT
          <br />
          100
        </h1>

        <p className="label mt-6 mb-[72px] opacity-40">
          Boekhouding zonder ruis
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-field-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="label">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="input-field"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Authenticatie..." : "Toegang"}
          </button>
        </form>

        <p className="label mt-10 opacity-40">
          Geen dossier?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground no-underline opacity-100 border-b border-b-foreground/30 pb-px"
          >
            Registreren
          </Link>
        </p>
      </div>
    </div>
  );
}
