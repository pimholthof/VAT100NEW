"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";
import { FieldGroup, ButtonPrimary, ErrorMessage, SuccessMessage } from "@/components/ui";

export default function SettingsPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });

  if (isLoading) {
    return (
      <div>
        <div className="skeleton h-12 w-[260px] mb-[80px]" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-5">
            <div className="skeleton h-[9px] w-20 mb-2.5" />
            <div className="skeleton h-9 w-full max-w-[480px]" />
          </div>
        ))}
      </div>
    );
  }

  if (result?.error) {
    return (
      <div>
        <h1 className="display-title m-0 mb-[80px]">
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
      <h1 className="display-title m-0 mb-[80px]">
        Instellingen
      </h1>

      {mutation.data?.error && (
        <ErrorMessage className="mb-6">
          {mutation.data.error}
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage className="mb-6">
          Instellingen opgeslagen.
        </SuccessMessage>
      )}

      <div className="max-w-[480px]">
        <div className="mb-[var(--space-block)]">
          <p className="label-strong m-0 mb-7 pt-3 border-t border-t-foreground/15">
            Persoonlijk
          </p>

          <FieldGroup label="Volledige naam">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Je volledige naam"
              className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
            />
          </FieldGroup>

          <FieldGroup label="Studionaam">
            <input
              type="text"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="Naam van je studio of bedrijf"
              className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
            />
          </FieldGroup>
        </div>

        <div className="mb-[var(--space-block)]">
          <p className="label-strong m-0 mb-7 pt-3 border-t border-t-foreground/15">
            Bedrijfsgegevens
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="KVK-nummer">
              <input
                type="text"
                value={kvkNumber}
                onChange={(e) => setKvkNumber(e.target.value)}
                placeholder="12345678"
                className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-mono text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
              />
            </FieldGroup>
            <FieldGroup label="BTW-nummer">
              <input
                type="text"
                value={btwNumber}
                onChange={(e) => setBtwNumber(e.target.value)}
                placeholder="NL123456789B01"
                className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-mono text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Adres">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straatnaam en huisnummer"
              className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
            />
          </FieldGroup>

          <div className="grid grid-cols-[1fr_2fr] gap-4">
            <FieldGroup label="Postcode">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1234 AB"
                className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
              />
            </FieldGroup>
            <FieldGroup label="Stad">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Stad"
                className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-sans text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
              />
            </FieldGroup>
          </div>
        </div>

        <div className="mb-[var(--space-block)]">
          <p className="label-strong m-0 mb-7 pt-3 border-t border-t-foreground/15">
            Bankgegevens
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="IBAN">
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="NL00BANK0123456789"
                className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-mono text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
              />
            </FieldGroup>
            <FieldGroup label="BIC">
              <input
                type="text"
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                placeholder="BANKNL2A"
                className="w-full py-2 px-0 border-none border-b border-b-[0.6px] border-b-[var(--vat-dark-grey)] bg-transparent text-foreground font-mono text-base font-normal outline-none transition-[border-color] duration-200 ease-in-out"
              />
            </FieldGroup>
          </div>
        </div>

        <div className="pt-7 border-t border-t-foreground/15">
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
