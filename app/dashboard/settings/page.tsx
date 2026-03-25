"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, uploadLogo, deleteLogo, getLogoUrl } from "@/features/profile/actions";
import type { Profile } from "@/lib/types";
import { FieldGroup, inputStyle, ButtonPrimary, ButtonSecondary, ErrorMessage } from "@/components/ui";

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
        <p
          role="status"
          aria-live="polite"
          style={{
            padding: 16,
            marginBottom: 24,
            background: "rgba(0,128,0,0.04)",
            borderLeft: "2px solid rgba(0,128,0,0.3)",
            fontSize: 11,
            fontWeight: 400,
          }}
        >
          Instellingen opgeslagen.
        </p>
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

        {/* Logo */}
        <LogoUpload logoPath={profile?.logo_path ?? null} />

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
                style={{ ...inputStyle }}
              />
            </FieldGroup>
            <FieldGroup label="BTW-nummer">
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                placeholder="NL123456789B01"
                style={{ ...inputStyle }}
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
                style={{ ...inputStyle }}
              />
            </FieldGroup>
            <FieldGroup label="BIC">
              <input
                type="text"
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                placeholder="BANKNL2A"
                style={{ ...inputStyle }}
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

function LogoUpload({ logoPath }: { logoPath: string | null }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (logoPath) {
      getLogoUrl().then((res) => {
        if (res.data) setLogoUrl(res.data);
      });
    }
  }, [logoPath]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadLogo(formData);
    if (res.error) {
      setError(res.error);
    } else {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Haal nieuwe signed URL op
      const urlRes = await getLogoUrl();
      if (urlRes.data) setLogoUrl(urlRes.data);
    }
    setUploading(false);
  };

  const handleDelete = async () => {
    setUploading(true);
    setError(null);
    const res = await deleteLogo();
    if (res.error) {
      setError(res.error);
    } else {
      setLogoUrl(null);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
    setUploading(false);
  };

  return (
    <div style={{ marginBottom: "var(--space-block)" }}>
      <p
        className="label-strong"
        style={{
          margin: "0 0 28px",
          paddingTop: 12,
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        Logo
      </p>

      {error && <ErrorMessage style={{ marginBottom: 16 }}>{error}</ErrorMessage>}

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {logoUrl ? (
          <div
            style={{
              position: "relative",
              width: 80,
              height: 80,
              border: "0.5px solid rgba(13,13,11,0.1)",
            }}
          >
            <Image
              src={logoUrl}
              alt="Bedrijfslogo"
              fill
              style={{ objectFit: "contain" }}
              unoptimized
            />
          </div>
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              border: "0.5px dashed rgba(13,13,11,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              opacity: 0.3,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Geen logo
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <ButtonSecondary
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploaden..." : logoUrl ? "Wijzig logo" : "Upload logo"}
          </ButtonSecondary>
          {logoUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.3,
                padding: 0,
                color: "var(--foreground)",
              }}
            >
              Verwijder
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: 11, opacity: 0.3, marginTop: 12 }}>
        PNG, JPG of SVG — max 2MB. Wordt getoond op facturen en offertes.
      </p>
    </div>
  );
}
