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
    <div className="auth-container">
      <div className="w-full max-w-[440px]">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-h1)] font-bold tracking-[var(--tracking-display)] leading-[0.9] m-0">
          Welkom
        </h1>
        <p className="label mt-6 mb-[48px] opacity-40">
          Vul je bedrijfsgegevens aan
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          {/* Section 1: Registratie */}
          <div>
            <p className="auth-step-indicator">01/04</p>
            <p className="label-strong auth-section-divider">Registratie</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="kvk_number" className="label">
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
                  className="input-field-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="btw_number" className="label">
                  BTW-nummer
                </label>
                <input
                  id="btw_number"
                  name="btw_number"
                  type="text"
                  required
                  placeholder="NL000000000B01"
                  autoComplete="off"
                  className="input-field-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Adres */}
          <div>
            <p className="auth-step-indicator">02/04</p>
            <p className="label-strong auth-section-divider">Adres</p>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="address" className="label">
                  Straat + nummer
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  autoComplete="street-address"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="postal_code" className="label">
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
                    className="input-field-mono"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="city" className="label">
                    Plaats
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bankgegevens */}
          <div>
            <p className="auth-step-indicator">03/04</p>
            <p className="label-strong auth-section-divider">Bankgegevens</p>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="iban" className="label">
                  IBAN
                </label>
                <input
                  id="iban"
                  name="iban"
                  type="text"
                  required
                  placeholder="NL00BANK0000000000"
                  autoComplete="off"
                  className="input-field-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="bic" className="label">
                  BIC
                </label>
                <input
                  id="bic"
                  name="bic"
                  type="text"
                  autoComplete="off"
                  className="input-field-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Belasting */}
          <div>
            <p className="auth-step-indicator">04/04</p>
            <p className="label-strong auth-section-divider">Belasting</p>
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="expected_annual_revenue" className="label">
                  Verwachte jaaromzet
                </label>
                <input
                  id="expected_annual_revenue"
                  name="expected_annual_revenue"
                  type="number"
                  defaultValue={60000}
                  min={0}
                  step={1000}
                  className="input-field-mono"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  name="zelfstandigenaftrek"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 accent-foreground"
                />
                <span className="font-[family-name:var(--font-body)] text-[13px] font-light">
                  Ik maak gebruik van de zelfstandigenaftrek
                </span>
              </label>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Bezig..." : "Opslaan & doorgaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
