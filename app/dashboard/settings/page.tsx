"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/features/profile/actions";
import type { Profile } from "@/lib/types";
import { FieldGroup, ButtonPrimary, ErrorMessage } from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";

export default function SettingsPage() {
  const { t } = useLocale();
  const { data: result, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 48, width: 260, marginBottom: 80 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ height: 9, width: 80, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 36, width: "100%", maxWidth: 480 }} />
          </div>
        ))}
      </div>
    );
  }

  if (result?.error) {
    return (
      <div>
        <h1 className="display-title" style={{ margin: "0 0 80px" }}>
          {t.settings.errorTitle}
        </h1>
        <ErrorMessage>{result.error}</ErrorMessage>
      </div>
    );
  }

  return <SettingsForm profile={result?.data ?? null} />;
}

function SettingsForm({ profile }: { profile: Profile | null }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [studioName, setStudioName] = useState(profile?.studio_name ?? "");
  const [kvkNumber, setKvkNumber] = useState(profile?.kvk_number ?? "");
  const [btwNumber, setBtwNumber] = useState(profile?.btw_number ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [iban, setIban] = useState(profile?.iban ?? "");
  const [bic, setBic] = useState(profile?.bic ?? "");
  const [estimatedIncome, setEstimatedIncome] = useState(
    profile?.estimated_annual_income != null ? String(profile.estimated_annual_income) : ""
  );
  const [usesKor, setUsesKor] = useState(profile?.uses_kor ?? false);
  const [meetsUrencriterium, setMeetsUrencriterium] = useState(profile?.meets_urencriterium ?? true);

  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const parsedIncome = estimatedIncome ? parseFloat(estimatedIncome) : null;
      return updateProfile({
        full_name: fullName,
        studio_name: studioName,
        kvk_number: kvkNumber,
        btw_number: btwNumber,
        address,
        postal_code: postalCode,
        city,
        iban,
        bic,
        uses_kor: usesKor,
        estimated_annual_income: parsedIncome && !isNaN(parsedIncome) ? parsedIncome : null,
        meets_urencriterium: meetsUrencriterium,
      });
    },
    onSuccess: (res) => {
      if (!res.error) {
        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setTimeout(() => setSuccess(false), 3000);
      }
    },
  });

  const handleSave = () => {
    setSuccess(false);
    mutation.mutate();
  };

  return (
    <div>
      <h1 className="display-title" style={{ margin: "0 0 var(--space-xl)" }}>
        {t.settings.title}
      </h1>

      {mutation.data?.error && (
        <ErrorMessage style={{ marginBottom: 24 }}>
          {mutation.data.error}
        </ErrorMessage>
      )}

      {success && (
        <ErrorMessage style={{ marginBottom: 24 }}>
          {t.settings.saved}
        </ErrorMessage>
      )}

      <div style={{ maxWidth: 480 }}>
        {/* Persoonlijk */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 16, borderTop: "0.5px solid rgba(0, 0, 0, 0.08)" }}>
            {t.settings.personal}
          </p>

          <FieldGroup label={t.settings.fullName}>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.settings.fullNamePlaceholder}
              className="form-input"
            />
          </FieldGroup>

          <FieldGroup label={t.settings.studioName}>
            <input
              type="text"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder={t.settings.studioNamePlaceholder}
              className="form-input"
            />
          </FieldGroup>
        </div>

        {/* Bedrijfsgegevens */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 16, borderTop: "0.5px solid rgba(0, 0, 0, 0.08)" }}>
            {t.settings.companyDetails}
          </p>

          <div className="responsive-grid-2">
            <FieldGroup label={t.settings.kvkNumber}>
              <input
                type="text"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                placeholder="12345678"
                className="form-input"
              />
            </FieldGroup>
            <FieldGroup label={t.settings.vatNumber}>
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                placeholder="NL123456789B01"
                className="form-input"
              />
            </FieldGroup>
          </div>

          <FieldGroup label={t.settings.streetNumber}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.settings.streetPlaceholder}
              className="form-input"
            />
          </FieldGroup>

          <div className="responsive-grid-2" style={{ gridTemplateColumns: "1fr 2fr" }}>
            <FieldGroup label={t.settings.postalCode}>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1234 AB"
                className="form-input"
              />
            </FieldGroup>
            <FieldGroup label={t.settings.city}>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Amsterdam"
                className="form-input"
              />
            </FieldGroup>
          </div>
        </div>

        {/* Bankgegevens */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 16, borderTop: "0.5px solid rgba(0, 0, 0, 0.08)" }}>
            {t.settings.bankDetails}
          </p>

          <div className="responsive-grid-2">
            <FieldGroup label={t.settings.iban}>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="NL00BANK0123456789"
                className="form-input"
              />
            </FieldGroup>
            <FieldGroup label={t.settings.bic}>
              <input
                type="text"
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                placeholder="BANKNL2A"
                className="form-input"
              />
            </FieldGroup>
          </div>
        </div>

        {/* Fiscaal profiel */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 24px", paddingTop: 16, borderTop: "0.5px solid rgba(0, 0, 0, 0.08)" }}>
            {t.settings.fiscal}
          </p>

          <FieldGroup label={t.settings.estimatedIncome}>
            <input
              type="number"
              value={estimatedIncome}
              onChange={(e) => setEstimatedIncome(e.target.value)}
              placeholder="45000"
              min="0"
              step="1000"
              className="form-input"
            />
          </FieldGroup>

          <FieldGroup label={t.settings.usesKor}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={usesKor}
                onChange={(e) => setUsesKor(e.target.checked)}
                style={{ accentColor: "var(--foreground)" }}
              />
              <span style={{ fontSize: "var(--text-body-md)" }}>
                {usesKor ? t.common.yes : t.common.no}
              </span>
            </label>
          </FieldGroup>

          <FieldGroup label={t.settings.meetsUrencriterium}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={meetsUrencriterium}
                onChange={(e) => setMeetsUrencriterium(e.target.checked)}
                style={{ accentColor: "var(--foreground)" }}
              />
              <span style={{ fontSize: "var(--text-body-md)" }}>
                {meetsUrencriterium ? t.common.yes : t.common.no}
              </span>
            </label>
          </FieldGroup>
        </div>

        {/* Save */}
        <div
          style={{
            paddingTop: 24,
            borderTop: "0.5px solid rgba(0, 0, 0, 0.08)",
          }}
        >
          <ButtonPrimary
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t.common.busy : t.common.save}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
