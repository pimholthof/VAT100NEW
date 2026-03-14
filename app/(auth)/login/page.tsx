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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[600px]">
        <h1 className="font-display text-[9rem] font-black tracking-[0.02em] leading-[0.85] m-0">
          VAT100
        </h1>
        <p className="font-body text-[13px] font-light mt-3 mb-14">
          Inloggen
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
              autoComplete="current-password"
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
            {pending ? "Bezig..." : "Inloggen"}
          </button>
        </form>

        <p className="font-body text-[12px] font-light mt-8">
          Nog geen account?{" "}
          <Link href="/register" className="font-medium text-foreground underline">
            Registreer
          </Link>
        </p>
      </div>
    </div>
  );
}
