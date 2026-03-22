"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNewClient, updateClient } from "@/features/clients/actions";
import type { Client, ClientInput } from "@/lib/types";
import {
  FieldGroup,
  inputStyle,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Bedrijfsnaam is verplicht.");
      return;
    }

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
      router.push(`/dashboard/clients/${result.data.id}`);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {error && (
        <ErrorMessage style={{ marginBottom: 24 }}>{error}</ErrorMessage>
      )}

      <FieldGroup label="Bedrijfsnaam *">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bedrijfsnaam"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Contactpersoon">
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Naam contactpersoon"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="E-mailadres">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@voorbeeld.nl"
          style={inputStyle}
        />
      </FieldGroup>

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
          Annuleer
        </ButtonSecondary>
        <ButtonPrimary onClick={handleSubmit} disabled={saving}>
          {saving ? "Opslaan..." : client ? "Bijwerken" : "Klant aanmaken"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
