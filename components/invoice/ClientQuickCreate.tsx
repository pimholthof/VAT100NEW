"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createNewClient } from "@/lib/actions/clients";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  inputStyle,
  ButtonPrimary,
  ButtonSecondary,
} from "@/components/ui";

const quickLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-label)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 8,
  opacity: 0.4,
};

interface ClientQuickCreateProps {
  onClose: () => void;
}

export function ClientQuickCreate({ onClose }: ClientQuickCreateProps) {
  const queryClient = useQueryClient();
  const setClientId = useInvoiceStore((s) => s.setClientId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setErrorMsg(null);
    const result = await createNewClient({
      name: name.trim(),
      contact_name: null,
      email: email.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      kvk_number: null,
      btw_number: null,
    });
    if (result.error) {
      setErrorMsg(result.error);
    } else if (result.data) {
      setClientId(result.data.id);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    }
  };

  return (
    <div
      style={{
        borderTop: "0.5px solid rgba(13,13,11,0.08)",
        borderBottom: "0.5px solid rgba(13,13,11,0.08)",
        padding: "20px 0",
        marginBottom: 24,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 16px",
          opacity: 0.4,
        }}
      >
        Nieuwe klant aanmaken
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>Bedrijfsnaam *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bedrijfsnaam"
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@voorbeeld.nl"
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>Adres</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Straatnaam en huisnummer"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={quickLabelStyle}>Postcode</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1234 AB"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={quickLabelStyle}>Stad</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Stad"
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <ButtonPrimary type="button" onClick={handleCreate}>
          Klant aanmaken
        </ButtonPrimary>
        <ButtonSecondary
          type="button"
          onClick={onClose}
          style={{ opacity: 0.4 }}
        >
          Annuleer
        </ButtonSecondary>
      </div>
      {errorMsg && (
        <p style={{ color: "var(--foreground)", opacity: 0.8, marginTop: 12, fontSize: "var(--text-body-sm)" }}>
          Fout: {errorMsg}
        </p>
      )}
    </div>
  );
}
