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
    <div className="auth-container">
      <div aria-hidden="true" className="auth-watermark">
        VAT100
      </div>

      <div className="auth-form-wrapper">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold tracking-[var(--tracking-display)] leading-[0.85] m-0">
          Systeem
          <br />
          Toegang
        </h1>
        <p className="label mt-6 mb-[72px] opacity-40">Start je dossier</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-9">
          <div className="flex flex-col gap-2">
            <label htmlFor="full_name" className="label">
              Volledige naam
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="studio_name" className="label">
              Studionaam
            </label>
            <input
              id="studio_name"
              name="studio_name"
              type="text"
              required
              placeholder="bijv. Maya Kowalski Studio"
              autoComplete="organization"
              className="input-field"
            />
          </div>

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
              autoComplete="new-password"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm_password" className="label">
              Wachtwoord bevestigen
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input-field"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Systeem configureren..." : "Account Aanmaken"}
          </button>
        </form>

        <p className="label mt-10 opacity-40">
          Al een dossier?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground no-underline opacity-100 border-b border-b-foreground/30 pb-px"
          >
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
