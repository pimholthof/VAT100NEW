"use client";

import { completeOnboarding } from "../actions";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { StepIndicator } from "@/components/ui/StepIndicator";
import type { VatFrequency } from "@/lib/types";

const textInputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "13px",
  fontWeight: 300,
  padding: "14px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(13,13,11,0.12)",
  background: "transparent",
  color: "var(--foreground)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const monoInputStyle: React.CSSProperties = {
  ...textInputStyle,
};

const radioStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 0",
  borderBottom: "0.5px solid rgba(13,13,11,0.06)",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 300,
};

type BookkeepingStartOption = "current_year" | "today" | "custom";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(1);
  const { t } = useLocale();

  const stepLabels = [t.auth.registration, t.auth.address, t.auth.bankDetails, t.auth.fiscalProfile];

  // Field state for step navigation
  const [kvk, setKvk] = useState("");
  const [btw, setBtw] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");

  // Fiscal profile state (step 4)
  const [vatFrequency, setVatFrequency] = useState<VatFrequency>("quarterly");
  const [bookkeepingStartOption, setBookkeepingStartOption] = useState<BookkeepingStartOption>("current_year");
  const [customStartDate, setCustomStartDate] = useState("");

  // Inline validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  function validateStep(): boolean {
    const errors: Record<string, string | null> = {};

    if (step === 1) {
      if (!kvk || !/^[0-9]{8}$/.test(kvk)) {
        errors.kvk = t.auth.eightDigits;
      }
      if (!btw) {
        errors.btw = "BTW-nummer is verplicht";
      }
    } else if (step === 2) {
      if (!address.trim()) errors.address = "Straat + nummer is verplicht";
      if (!postalCode.trim() || !/^[0-9]{4}\s?[A-Za-z]{2}$/.test(postalCode)) {
        errors.postalCode = t.auth.postalCodeTitle;
      }
      if (!city.trim()) errors.city = "Plaats is verplicht";
    }
    // Step 3 (bank) — no blocking validation
    // Step 4 (fiscal) — defaults are always valid

    setFieldErrors(errors);
    return Object.values(errors).every((e) => !e);
  }

  function handleNext() {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 4));
      setError(null);
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
    setError(null);
  }

  function getBookkeepingStartDate(): string {
    const now = new Date();
    if (bookkeepingStartOption === "today") {
      return now.toISOString().split("T")[0];
    }
    if (bookkeepingStartOption === "custom" && customStartDate) {
      return customStartDate;
    }
    // Default: start of current fiscal year
    return `${now.getFullYear()}-01-01`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!validateStep()) return;

    setPending(true);

    const formData = new FormData();
    formData.append("kvk_number", kvk);
    formData.append("btw_number", btw);
    formData.append("address", address);
    formData.append("postal_code", postalCode);
    formData.append("city", city);
    formData.append("iban", iban);
    formData.append("bic", bic);
    formData.append("vat_frequency", vatFrequency);
    formData.append("bookkeeping_start_date", getBookkeepingStartDate());

    const result = await completeOnboarding(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", alignItems: "center", justifyItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1
          style={{
            fontSize: "var(--text-display-lg)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 0.9,
            margin: 0,
          }}
        >
          {t.auth.welcome}
        </h1>
        <p
          className="label"
          style={{
            marginTop: 24,
            marginBottom: 40,
            letterSpacing: "var(--tracking-caps)",
            opacity: 0.4,
          }}
        >
          {t.auth.fillCompanyDetails}
        </p>

        <StepIndicator currentStep={step} totalSteps={4} labels={stepLabels} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {/* Stap 1: Bedrijfsregistratie */}
          {step === 1 && (
            <div>
              <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 8, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
                {t.auth.registration}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="kvk_number" className="label">{t.auth.kvkNumber}</label>
                  <input
                    id="kvk_number"
                    type="text"
                    value={kvk}
                    onChange={(e) => setKvk(e.target.value)}
                    required
                    pattern="[0-9]{8}"
                    title={t.auth.eightDigits}
                    autoComplete="off"
                    style={monoInputStyle}
                  />
                  {fieldErrors.kvk && (
                    <span style={{ fontSize: 11, color: "var(--color-accent)" }}>{fieldErrors.kvk}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="btw_number" className="label">{t.auth.vatNumber}</label>
                  <input
                    id="btw_number"
                    type="text"
                    value={btw}
                    onChange={(e) => setBtw(e.target.value)}
                    required
                    placeholder="NL000000000B01"
                    autoComplete="off"
                    style={monoInputStyle}
                  />
                  {fieldErrors.btw && (
                    <span style={{ fontSize: 11, color: "var(--color-accent)" }}>{fieldErrors.btw}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stap 2: Adres */}
          {step === 2 && (
            <div>
              <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 8, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
                {t.auth.address}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="address" className="label">{t.auth.streetNumber}</label>
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    autoComplete="street-address"
                    style={textInputStyle}
                  />
                  {fieldErrors.address && (
                    <span style={{ fontSize: 11, color: "var(--color-accent)" }}>{fieldErrors.address}</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label htmlFor="postal_code" className="label">{t.auth.postalCode}</label>
                    <input
                      id="postal_code"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                      pattern="[0-9]{4}\s?[A-Za-z]{2}"
                      title={t.auth.postalCodeTitle}
                      autoComplete="postal-code"
                      style={textInputStyle}
                    />
                    {fieldErrors.postalCode && (
                      <span style={{ fontSize: 11, color: "var(--color-accent)" }}>{fieldErrors.postalCode}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label htmlFor="city" className="label">{t.auth.city}</label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      autoComplete="address-level2"
                      style={textInputStyle}
                    />
                    {fieldErrors.city && (
                      <span style={{ fontSize: 11, color: "var(--color-accent)" }}>{fieldErrors.city}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stap 3: Bankgegevens */}
          {step === 3 && (
            <div>
              <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 8, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
                {t.auth.bankDetails}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="iban" className="label">{t.auth.iban}</label>
                  <input
                    id="iban"
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    required
                    placeholder="NL00BANK0000000000"
                    pattern="[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{10}"
                    title="e.g. NL00BANK0000000000"
                    autoComplete="off"
                    style={monoInputStyle}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="bic" className="label">{t.auth.bic}</label>
                  <input
                    id="bic"
                    type="text"
                    value={bic}
                    onChange={(e) => setBic(e.target.value)}
                    autoComplete="off"
                    style={monoInputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stap 4: Fiscaal profiel */}
          {step === 4 && (
            <div>
              <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 8, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
                {t.auth.fiscalProfile}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* BTW frequentie */}
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 12 }}>
                    {t.auth.vatFrequency}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {(["quarterly", "monthly", "yearly"] as const).map((freq) => (
                      <label key={freq} style={radioStyle}>
                        <input
                          type="radio"
                          name="vat_frequency"
                          value={freq}
                          checked={vatFrequency === freq}
                          onChange={() => setVatFrequency(freq)}
                          style={{ accentColor: "var(--foreground)" }}
                        />
                        <span>
                          {freq === "quarterly" && t.auth.vatQuarterly}
                          {freq === "monthly" && t.auth.vatMonthly}
                          {freq === "yearly" && t.auth.vatYearly}
                          {freq === "quarterly" && (
                            <span style={{ opacity: 0.4, fontSize: 11, marginLeft: 8 }}>
                              {t.auth.vatQuarterlyHint}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Boekhouding startdatum */}
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 12 }}>
                    {t.auth.bookkeepingStart}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {(["current_year", "today", "custom"] as const).map((opt) => (
                      <label key={opt} style={radioStyle}>
                        <input
                          type="radio"
                          name="bookkeeping_start"
                          value={opt}
                          checked={bookkeepingStartOption === opt}
                          onChange={() => setBookkeepingStartOption(opt)}
                          style={{ accentColor: "var(--foreground)" }}
                        />
                        <span>
                          {opt === "current_year" && t.auth.bookkeepingStartCurrent}
                          {opt === "today" && t.auth.bookkeepingStartToday}
                          {opt === "custom" && t.auth.bookkeepingStartCustom}
                        </span>
                      </label>
                    ))}
                    {bookkeepingStartOption === "custom" && (
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{ ...textInputStyle, marginTop: 8, maxWidth: 200 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                padding: 16,
                background: "rgba(13,13,11,0.02)",
                fontSize: "11px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  padding: 24,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  flex: 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                {t.common.back}
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  padding: 24,
                  border: "none",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  cursor: "pointer",
                  flex: 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                {t.common.next}
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending}
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  padding: 24,
                  border: "none",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  cursor: "pointer",
                  flex: 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                {pending ? t.common.busy : t.auth.saveAndContinue}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
