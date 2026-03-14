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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[600px]">
        <h1 className="font-display text-[9rem] font-black tracking-[0.02em] leading-[0.85] m-0">
          VAT100
        </h1>
        <p className="font-body text-[13px] font-light mt-3 mb-14">
          Account aanmaken
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full_name" className="font-body text-[10px] font-normal tracking-[0.02em]">
              Volledige naam
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="studio_name" className="font-body text-[10px] font-normal tracking-[0.02em]">
              Studionaam
            </label>
            <input
              id="studio_name"
              name="studio_name"
              type="text"
              required
              placeholder="bijv. Maya Kowalski Studio"
              autoComplete="organization"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-body text-[10px] font-normal tracking-[0.02em]">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-body text-[10px] font-normal tracking-[0.02em]">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm_password" className="font-body text-[10px] font-normal tracking-[0.02em]">
              Wachtwoord bevestigen
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          {error && (
            <p className="font-body text-[11px] font-normal text-foreground m-0 py-3 px-4 border-0 border-l-2 border-l-foreground">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="font-body text-[13px] font-medium tracking-[0.05em] py-3.5 px-4 border-0 bg-foreground text-background cursor-pointer w-full"
          >
            {pending ? "Bezig..." : "Registreren"}
          </button>
        </form>

        <p className="font-body text-[12px] font-light mt-8">
          Al een account?{" "}
          <Link href="/login" className="font-medium text-foreground underline">
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
