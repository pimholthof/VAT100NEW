"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createNewClient } from "@/features/clients/actions";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  ButtonPrimary,
  ButtonSecondary,
  FieldError,
} from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";

const quickLabelStyle: React.CSSProperties = {
  display: "block",
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
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setErrorMsg(null);
    setCreating(true);
    try {
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
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
        onClose();
      }
    } finally {
      setCreating(false);
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
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 16px",
          opacity: 0.4,
        }}
      >
        {t.clients.addQuickClient}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>{t.clients.companyName} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.clients.companyName}
            className="form-input"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>{t.clients.email}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.clients.emailPlaceholder}
            className="form-input"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={quickLabelStyle}>{t.clients.address}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t.clients.addressPlaceholder}
            className="form-input"
          />
        </div>
        <div>
          <label style={quickLabelStyle}>{t.clients.postalCode}</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1234 AB"
            className="form-input"
          />
        </div>
        <div>
          <label style={quickLabelStyle}>{t.clients.city}</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t.clients.city}
            className="form-input"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <ButtonPrimary type="button" onClick={handleCreate} loading={creating}>
          {t.clients.createClient}
        </ButtonPrimary>
        <ButtonSecondary
          type="button"
          onClick={onClose}
          disabled={creating}
          style={{ opacity: 0.4 }}
        >
          {t.common.cancel}
        </ButtonSecondary>
      </div>
      {errorMsg && (
        <FieldError style={{ marginTop: 12 }}>{errorMsg}</FieldError>
      )}
    </div>
  );
}
