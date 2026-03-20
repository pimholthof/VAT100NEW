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
    <div className="min-h-screen grid items-center justify-items-center p-6 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-10 -left-5 font-[family-name:var(--font-display)] text-[min(14rem,28vw)] font-bold tracking-[var(--tracking-display)] leading-[0.85] text-foreground opacity-[0.04] pointer-events-none select-none whitespace-nowrap"
      >
        VAT100
      </div>

      <div className="w-full max-w-[340px] relative z-[1]">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-display-xl)] font-bold tracking-[var(--tracking-display)] leading-[0.85] m-0">
          Systeem
          <br/>Toegang
        </h1>
        <p className="label mt-6 mb-[72px] tracking-[var(--tracking-caps)] opacity-40">
          Start je dossier
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-9">
          <div className="flex flex-col gap-2">
            <label htmlFor="full_name" className="label">Volledige naam</label>
            <input id="full_name" name="full_name" type="text" required autoComplete="name" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full" />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="studio_name" className="label">Studionaam</label>
            <input id="studio_name" name="studio_name" type="text" required placeholder="bijv. Maya Kowalski Studio" autoComplete="organization" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full" />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="label">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="font-mono text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full" />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="label">Wachtwoord</label>
            <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full" />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm_password" className="label">Wachtwoord bevestigen</label>
            <input id="confirm_password" name="confirm_password" type="password" required minLength={6} autoComplete="new-password" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full" />
          </div>

          {error && (
            <div className="p-4 bg-foreground/[0.02] font-mono text-[11px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="font-sans text-[length:var(--text-label)] font-medium tracking-[0.10em] uppercase p-6 border-none bg-foreground text-background cursor-pointer w-full transition-opacity duration-150 ease-in-out"
          >
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
