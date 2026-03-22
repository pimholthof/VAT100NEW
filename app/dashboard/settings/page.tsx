"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/features/profile/actions";
import type { Profile } from "@/lib/types";
import { FieldGroup, inputStyle, ButtonPrimary, ErrorMessage } from "@/components/ui";

export default function SettingsPage() {
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
          Instellingen
        </h1>
        <ErrorMessage>{result.error}</ErrorMessage>
      </div>
    );
  }

  return <SettingsForm profile={result?.data ?? null} />;
}

function SettingsForm({ profile }: { profile: Profile | null }) {
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

  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateProfile({
        full_name: fullName,
        studio_name: studioName,
        kvk_number: kvkNumber,
        btw_number: btwNumber,
        address,
        postal_code: postalCode,
        city,
        iban,
        bic,
      }),
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
      <h1 className="display-title" style={{ margin: "0 0 80px" }}>
        Instellingen
      </h1>

      {mutation.data?.error && (
        <ErrorMessage style={{ marginBottom: 24 }}>
          {mutation.data.error}
        </ErrorMessage>
      )}

      {success && (
        <ErrorMessage style={{ marginBottom: 24 }}>
          Instellingen opgeslagen.
        </ErrorMessage>
      )}

      <div style={{ maxWidth: 480 }}>
        {/* Persoonlijk */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 28px", paddingTop: 12, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
            Persoonlijk
          </p>

          <FieldGroup label="Volledige naam">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Je volledige naam"
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label="Studionaam">
            <input
              type="text"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="Naam van je studio of bedrijf"
              style={inputStyle}
            />
          </FieldGroup>
        </div>

        {/* Bedrijfsgegevens */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 28px", paddingTop: 12, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
            Bedrijfsgegevens
          </p>

          <div className="responsive-grid-2">
            <FieldGroup label="KVK-nummer">
              <input
                type="text"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                placeholder="12345678"
                style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
              />
            </FieldGroup>
            <FieldGroup label="BTW-nummer">
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                placeholder="NL123456789B01"
                style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Adres">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straatnaam en huisnummer"
              style={inputStyle}
            />
          </FieldGroup>

          <div className="responsive-grid-2" style={{ gridTemplateColumns: "1fr 2fr" }}>
            <FieldGroup label="Postcode">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1234 AB"
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="Stad">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Stad"
                style={inputStyle}
              />
            </FieldGroup>
          </div>
        </div>

        {/* Bankgegevens */}
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label-strong" style={{ margin: "0 0 28px", paddingTop: 12, borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
            Bankgegevens
          </p>

          <div className="responsive-grid-2">
            <FieldGroup label="IBAN">
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="NL00BANK0123456789"
                style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
              />
            </FieldGroup>
            <FieldGroup label="BIC">
              <input
                type="text"
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                placeholder="BANKNL2A"
                style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
              />
            </FieldGroup>
          </div>
        </div>

        {/* Save */}
        <div
          style={{
            paddingTop: 28,
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
          }}
        >
          <ButtonPrimary
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Opslaan..." : "Opslaan"}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
