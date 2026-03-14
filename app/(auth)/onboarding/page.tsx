"use client";

import { completeOnboarding } from "../actions";
import { useState } from "react";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await completeOnboarding(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[600px]">
        <h1 className="font-display text-[4rem] font-black tracking-[0.02em] leading-none m-0">
          Welkom
        </h1>
        <p className="font-body text-[13px] font-light mt-3 mb-14">
          Vul je bedrijfsgegevens aan
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="kvk_number" className="font-body text-[10px] font-normal tracking-[0.02em]">
                KVK-nummer
              </label>
              <input
                id="kvk_number"
                name="kvk_number"
                type="text"
                required
                pattern="[0-9]{8}"
                title="8 cijfers"
                autoComplete="off"
                className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none w-full box-border"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="btw_number" className="font-body text-[10px] font-normal tracking-[0.02em]">
                BTW-nummer
              </label>
              <input
                id="btw_number"
                name="btw_number"
                type="text"
                required
                placeholder="NL000000000B01"
                autoComplete="off"
                className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none w-full box-border"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="address" className="font-body text-[10px] font-normal tracking-[0.02em]">
              Adres
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              autoComplete="street-address"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="postal_code" className="font-body text-[10px] font-normal tracking-[0.02em]">
                Postcode
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                required
                pattern="[0-9]{4}\s?[A-Za-z]{2}"
                title="bijv. 1234 AB"
                autoComplete="postal-code"
                className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none w-full box-border"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="font-body text-[10px] font-normal tracking-[0.02em]">
                Plaats
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                autoComplete="address-level2"
                className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none w-full box-border"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="iban" className="font-body text-[10px] font-normal tracking-[0.02em]">
              IBAN
            </label>
            <input
              id="iban"
              name="iban"
              type="text"
              required
              placeholder="NL00BANK0000000000"
              autoComplete="off"
              className="font-body text-[13px] font-light py-3 px-0.5 border-0 border-b border-b-foreground/20 bg-transparent text-foreground outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bic" className="font-body text-[10px] font-normal tracking-[0.02em]">
              BIC
            </label>
            <input
              id="bic"
              name="bic"
              type="text"
              autoComplete="off"
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
            {pending ? "Bezig..." : "Opslaan & doorgaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
