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
    <div className="min-h-screen grid items-center justify-items-center p-6">
      <div className="w-full max-w-[400px]">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-display-lg)] font-bold tracking-[var(--tracking-display)] leading-[0.9] m-0">
          Welkom
        </h1>
        <p className="label mt-6 mb-[72px] tracking-[var(--tracking-caps)] opacity-40">
          Vul je bedrijfsgegevens aan
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          <div>
            <p className="label-strong m-0 mb-6 pt-2 border-t border-t-foreground/15">
              Registratie
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="kvk_number" className="label">KVK-nummer</label>
                <input id="kvk_number" name="kvk_number" type="text" required pattern="[0-9]{8}" title="8 cijfers" autoComplete="off" className="font-mono text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="btw_number" className="label">BTW-nummer</label>
                <input id="btw_number" name="btw_number" type="text" required placeholder="NL000000000B01" autoComplete="off" className="font-mono text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
              </div>
            </div>
          </div>

          <div>
            <p className="label-strong m-0 mb-6 pt-2 border-t border-t-foreground/15">
              Adres
            </p>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="address" className="label">Straat + nummer</label>
                <input id="address" name="address" type="text" required autoComplete="street-address" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="postal_code" className="label">Postcode</label>
                  <input id="postal_code" name="postal_code" type="text" required pattern="[0-9]{4}\s?[A-Za-z]{2}" title="bijv. 1234 AB" autoComplete="postal-code" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="city" className="label">Plaats</label>
                  <input id="city" name="city" type="text" required autoComplete="address-level2" className="font-sans text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="label-strong m-0 mb-6 pt-2 border-t border-t-foreground/15">
              Bankgegevens
            </p>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="iban" className="label">IBAN</label>
                <input id="iban" name="iban" type="text" required placeholder="NL00BANK0000000000" autoComplete="off" className="font-mono text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="bic" className="label">BIC</label>
                <input id="bic" name="bic" type="text" autoComplete="off" className="font-mono text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
              </div>
            </div>
          </div>

          <div>
            <p className="label-strong m-0 mb-6 pt-2 border-t border-t-foreground/15">
              Belasting
            </p>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="expected_annual_revenue" className="label">Verwachte jaaromzet</label>
                <input id="expected_annual_revenue" name="expected_annual_revenue" type="number" defaultValue={60000} min={0} step={1000} className="font-mono text-[13px] font-light py-3.5 px-0 border-none border-b border-b-foreground/12 bg-transparent text-foreground outline-none w-full box-border" />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input name="zelfstandigenaftrek" type="checkbox" defaultChecked className="w-4 h-4 accent-foreground" />
                <span className="font-sans text-[13px] font-light">
                  Ik maak gebruik van de zelfstandigenaftrek
                </span>
              </label>
            </div>
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
            {pending ? "Bezig..." : "Opslaan & doorgaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
