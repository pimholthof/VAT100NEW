"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLogoUrl, uploadLogo, deleteLogo } from "@/features/profile/actions";
import { getActiveSubscription } from "@/features/subscriptions/actions";
import { ButtonPrimary, ButtonSecondary, ErrorMessage } from "@/components/ui";

export function LogoUploadSection() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: subscription } = useQuery({
    queryKey: ["active-subscription"],
    queryFn: () => getActiveSubscription(),
    staleTime: 5 * 60_000,
  });
  const isPlus =
    subscription?.plan_id === "plus" || subscription?.plan_id === "plus_yearly";

  const { data: logoResult } = useQuery({
    queryKey: ["profile-logo-url"],
    queryFn: () => getLogoUrl(),
    enabled: isPlus,
    staleTime: 5 * 60_000,
  });
  const logoUrl = logoResult?.data ?? null;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return uploadLogo(fd);
    },
    onSuccess: (res) => {
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["profile-logo-url"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-logo-url"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    uploadMutation.mutate(file);
    e.target.value = "";
  }

  return (
    <div style={{ marginBottom: "var(--space-block)" }}>
      <p
        className="label-strong"
        style={{
          margin: "0 0 24px",
          paddingTop: 16,
          borderTop: "0.5px solid rgba(0, 0, 0, 0.08)",
        }}
      >
        Logo & witlabel
      </p>

      {!isPlus ? (
        <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.6 }}>
          Eigen logo en witlabel-facturen (zonder &ldquo;Gemaakt met VAT100&rdquo;) zijn
          beschikbaar op het <strong>Plus</strong>-abonnement.
          <div style={{ marginTop: 12 }}>
            <a
              href="/dashboard/settings/abonnement"
              style={{
                fontSize: 12,
                letterSpacing: "0.05em",
                textDecoration: "underline",
                color: "var(--foreground)",
              }}
            >
              Bekijk abonnementen
            </a>
          </div>
        </div>
      ) : (
        <div>
          <span style={{ fontSize: 11, opacity: 0.4, display: "block", marginBottom: 12 }}>
            PNG, JPG of SVG. Maximaal 2MB. Vervangt de &ldquo;VAT100&rdquo;-tekst in jouw factuur-templates.
          </span>

          {logoUrl && (
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                border: "0.5px solid rgba(0,0,0,0.08)",
                background: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 180,
                minHeight: 80,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Jouw logo"
                style={{ maxHeight: 80, maxWidth: 240, objectFit: "contain" }}
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ButtonPrimary
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending
                ? "Uploaden..."
                : logoUrl
                  ? "Vervangen"
                  : "Logo uploaden"}
            </ButtonPrimary>
            {logoUrl && (
              <ButtonSecondary
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Verwijderen..." : "Verwijderen"}
              </ButtonSecondary>
            )}
          </div>

          {error && (
            <ErrorMessage style={{ marginTop: 12 }}>{error}</ErrorMessage>
          )}
        </div>
      )}
    </div>
  );
}
