"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";
import { FieldGroup, inputStyle, buttonPrimaryStyle } from "@/components/ui";

export default function SettingsPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });

  if (isLoading) {
    return (
      <div>
        <div
          style={{
            height: 40,
            width: 200,
            background: "rgba(13, 13, 11, 0.06)",
            marginBottom: 48,
          }}
        />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div
              style={{
                height: 10,
                width: 80,
                background: "rgba(13, 13, 11, 0.06)",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                height: 36,
                width: "100%",
                maxWidth: 600,
                background: "rgba(13, 13, 11, 0.04)",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (result?.error) {
    return (
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: "0 0 48px",
          }}
        >
          Instellingen
        </h1>
        <div
          style={{
            padding: "12px 16px",
            border: "none",
            borderLeft: "2px solid var(--foreground)",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          {result.error}
        </div>
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
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 48px",
        }}
      >
        Instellingen
      </h1>

      {mutation.data?.error && (
        <div
          style={{
            padding: "12px 16px",
            border: "none",
            borderLeft: "2px solid var(--foreground)",
            marginBottom: 24,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          {mutation.data.error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "12px 16px",
            border: "none",
            borderLeft: "2px solid var(--foreground)",
            marginBottom: 24,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          Instellingen opgeslagen.
        </div>
      )}

      <div style={{ maxWidth: 600 }}>
        {/* Persoonlijk */}
        <SectionTitle>Persoonlijk</SectionTitle>

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

        {/* Bedrijfsgegevens */}
        <div
          style={{
            borderTop: "var(--border-rule)",
            marginTop: 32,
            paddingTop: 32,
          }}
        >
          <SectionTitle>Bedrijfsgegevens</SectionTitle>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <FieldGroup label="KVK-nummer">
            <input
              type="text"
              value={kvkNumber}
              onChange={(e) => setKvkNumber(e.target.value)}
              placeholder="12345678"
              style={inputStyle}
            />
          </FieldGroup>
          <FieldGroup label="BTW-nummer">
            <input
              type="text"
              value={btwNumber}
              onChange={(e) => setBtwNumber(e.target.value)}
              placeholder="NL123456789B01"
              style={inputStyle}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 16,
          }}
        >
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <FieldGroup label="IBAN">
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="NL00BANK0123456789"
              style={inputStyle}
            />
          </FieldGroup>
          <FieldGroup label="BIC">
            <input
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value)}
              placeholder="BANKNL2A"
              style={inputStyle}
            />
          </FieldGroup>
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "var(--border-rule)",
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            style={buttonPrimaryStyle}
          >
            {mutation.isPending ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display), sans-serif",
        fontSize: "var(--text-display-sm)",
        fontWeight: 900,
        letterSpacing: "var(--tracking-display)",
        lineHeight: 1,
        margin: "0 0 24px",
      }}
    >
      {children}
    </h2>
  );
}

