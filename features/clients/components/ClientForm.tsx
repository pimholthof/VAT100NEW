"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNewClient, updateClient } from "@/features/clients/actions";
import type { Client, ClientInput } from "@/lib/types";
import {
  FieldGroup,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import { validateEmail, validateKvk, validateBtw } from "@/lib/validation/client-validators";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(client?.name ?? "");
  const [contactName, setContactName] = useState(client?.contact_name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [postalCode, setPostalCode] = useState(client?.postal_code ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [kvkNumber, setKvkNumber] = useState(client?.kvk_number ?? "");
  const [btwNumber, setBtwNumber] = useState(client?.btw_number ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  function validateField(field: string, value: string) {
    let err: string | null = null;
    if (field === "email" && value) err = validateEmail(value);
    if (field === "kvk" && value) err = validateKvk(value);
    if (field === "btw" && value) err = validateBtw(value);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t.clients.companyNameRequired);
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    const kvkErr = validateKvk(kvkNumber);
    if (kvkErr) { setError(kvkErr); return; }

    const btwErr = validateBtw(btwNumber);
    if (btwErr) { setError(btwErr); return; }

    setSaving(true);
    setError(null);

    const input: ClientInput = {
      name,
      contact_name: contactName || null,
      email: email || null,
      address: address || null,
      city: city || null,
      postal_code: postalCode || null,
      kvk_number: kvkNumber || null,
      btw_number: btwNumber || null,
    };

    const result = client
      ? await updateClient(client.id, input)
      : await createNewClient(input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    if (result.data) {
      toast(client ? "Klant bijgewerkt" : "Klant aangemaakt");
      router.push(`/dashboard/clients/${result.data.id}`);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {error && (
        <ErrorMessage style={{ marginBottom: 24 }}>{error}</ErrorMessage>
      )}

      <FieldGroup label={`${t.clients.companyName} *`}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.clients.companyName}
          className="form-input"
        />
      </FieldGroup>

      <FieldGroup label={t.clients.contactPerson}>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={t.clients.contactPerson}
          className="form-input"
        />
      </FieldGroup>

      <FieldGroup label={t.clients.email}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateField("email", email)}
          placeholder="email@voorbeeld.nl"
          className="form-input"
        />
        {fieldErrors.email && (
          <span style={{ fontSize: 11, color: "var(--color-accent)", marginTop: 4, display: "block" }}>{fieldErrors.email}</span>
        )}
      </FieldGroup>

      <FieldGroup label={t.clients.address}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t.clients.address}
          className="form-input"
        />
      </FieldGroup>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 16,
        }}
      >
        <FieldGroup label={t.clients.postalCode}>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1234 AB"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label={t.clients.city}>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t.clients.city}
            className="form-input"
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
        <FieldGroup label={t.clients.kvkNumber}>
          <input
            type="text"
            value={kvkNumber}
            onChange={(e) => setKvkNumber(e.target.value)}
            onBlur={() => validateField("kvk", kvkNumber)}
            placeholder="12345678"
            className="form-input"
          />
          {fieldErrors.kvk && (
            <span style={{ fontSize: 11, color: "var(--color-accent)", marginTop: 4, display: "block" }}>{fieldErrors.kvk}</span>
          )}
        </FieldGroup>
        <FieldGroup label={t.clients.vatNumber}>
          <input
            type="text"
            value={btwNumber}
            onChange={(e) => setBtwNumber(e.target.value)}
            onBlur={() => validateField("btw", btwNumber)}
            placeholder="NL123456789B01"
            className="form-input"
          />
          {fieldErrors.btw && (
            <span style={{ fontSize: 11, color: "var(--color-accent)", marginTop: 4, display: "block" }}>{fieldErrors.btw}</span>
          )}
        </FieldGroup>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 32,
          paddingTop: 24,
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        <ButtonSecondary onClick={() => router.back()}>
          {t.common.cancel}
        </ButtonSecondary>
        <ButtonPrimary onClick={handleSubmit} disabled={saving}>
          {saving ? t.common.saving : client ? t.clients.update : t.clients.createClient}
        </ButtonPrimary>
      </div>
    </div>
  );
}
