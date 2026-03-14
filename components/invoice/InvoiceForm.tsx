"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
} from "@/lib/actions/invoices";
import { getClients, createQuickClient } from "@/lib/actions/clients";
import { InvoiceLineRow } from "./InvoiceLineRow";
import type { VatRate } from "@/lib/types";
import {
  FieldGroup,
  inputStyle,
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  buttonPrimaryStyle,
  buttonSecondaryStyle,
} from "@/components/ui";

interface InvoiceFormProps {
  invoiceId?: string;
}

export function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientCity, setNewClientCity] = useState("");
  const [newClientPostalCode, setNewClientPostalCode] = useState("");
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queryClient = useQueryClient();
  const store = useInvoiceStore();

  const { data: clientsResult } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  const clients = clientsResult?.data ?? [];

  // Generate invoice number for new invoices
  useEffect(() => {
    if (!invoiceId && !store.invoiceNumber) {
      generateInvoiceNumber().then((result) => {
        if (result.data) {
          store.setInvoiceNumber(result.data);
        }
      });
    }
  }, [invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft every 30 seconds
  const handleAutoSave = useCallback(async () => {
    const s = useInvoiceStore.getState();
    if (!s.isDirty || !s.clientId || !s.invoiceNumber) return;

    if (invoiceId) {
      await updateInvoice(invoiceId, s.toInput("draft"));
    } else {
      // For new invoices, don't auto-create — only auto-save existing ones
      return;
    }
    useInvoiceStore.getState().markSaved();
  }, [invoiceId]);

  useEffect(() => {
    autoSaveRef.current = setInterval(handleAutoSave, 30_000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [handleAutoSave]);

  const handleSave = async (andPreview: boolean) => {
    if (!store.clientId) {
      setError("Selecteer een klant.");
      return;
    }
    if (!store.invoiceNumber) {
      setError("Factuurnummer is verplicht.");
      return;
    }

    setSaving(true);
    setError(null);

    const status = andPreview ? "sent" : "draft";
    const input = store.toInput(status as "draft" | "sent");

    let result;
    if (invoiceId) {
      result = await updateInvoice(invoiceId, input);
      if (!result.error) {
        store.markSaved();
        if (andPreview) {
          router.push(`/dashboard/invoices/${invoiceId}/preview`);
        }
      }
    } else {
      result = await createInvoice(input);
      if (!result.error && result.data) {
        store.markSaved();
        if (andPreview) {
          router.push(`/dashboard/invoices/${result.data}/preview`);
        } else {
          router.push(`/dashboard/invoices/${result.data}`);
        }
      }
    }

    if (result.error) {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleCreateQuickClient = async () => {
    if (!newClientName.trim()) return;
    const result = await createQuickClient({
      name: newClientName.trim(),
      contact_name: null,
      email: newClientEmail.trim() || null,
      address: newClientAddress.trim() || null,
      city: newClientCity.trim() || null,
      postal_code: newClientPostalCode.trim() || null,
      kvk_number: null,
      btw_number: null,
    });
    if (result.data) {
      store.setClientId(result.data.id);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientAddress("");
      setNewClientCity("");
      setNewClientPostalCode("");
      setShowNewClient(false);
      // Refresh clients list
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {error && (
        <ErrorMessage style={{ marginBottom: 24 }}>{error}</ErrorMessage>
      )}

      {/* Client selector */}
      <FieldGroup label="Klant">
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={store.clientId}
            onChange={(e) => store.setClientId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Selecteer klant —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewClient(!showNewClient)}
            style={buttonSecondaryStyle}
          >
            {showNewClient ? "Annuleer" : "+ Nieuw"}
          </button>
        </div>
      </FieldGroup>

      {/* Slide-in new client panel */}
      {showNewClient && (
        <div
          style={{
            border: "none",
            borderTop: "var(--border-rule)",
            borderBottom: "var(--border-rule)",
            padding: 20,
            marginBottom: 24,
            background: "var(--background)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-sm)",
              fontWeight: 500,
              letterSpacing: "0.02em",
              margin: "0 0 16px",
            }}
          >
            Nieuwe klant aanmaken
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={quickLabelStyle}>Bedrijfsnaam *</label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Bedrijfsnaam"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={quickLabelStyle}>E-mailadres</label>
              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="email@voorbeeld.nl"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={quickLabelStyle}>Adres</label>
              <input
                type="text"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                placeholder="Straatnaam en huisnummer"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={quickLabelStyle}>Postcode</label>
              <input
                type="text"
                value={newClientPostalCode}
                onChange={(e) => setNewClientPostalCode(e.target.value)}
                placeholder="1234 AB"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={quickLabelStyle}>Stad</label>
              <input
                type="text"
                value={newClientCity}
                onChange={(e) => setNewClientCity(e.target.value)}
                placeholder="Stad"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={handleCreateQuickClient}
              style={buttonPrimaryStyle}
            >
              Klant aanmaken
            </button>
            <button
              type="button"
              onClick={() => setShowNewClient(false)}
              style={{ ...buttonSecondaryStyle, opacity: 0.6 }}
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Invoice number + dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <FieldGroup label="Factuurnummer">
          <input
            type="text"
            value={store.invoiceNumber}
            onChange={(e) => store.setInvoiceNumber(e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>
        <FieldGroup label="Factuurdatum">
          <input
            type="date"
            value={store.issueDate}
            onChange={(e) => store.setIssueDate(e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>
        <FieldGroup label="Vervaldatum">
          <input
            type="date"
            value={store.dueDate}
            onChange={(e) => store.setDueDate(e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>
      </div>

      {/* Invoice lines */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 80px 90px 100px 100px 60px",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <LabelCell>Omschrijving</LabelCell>
          <LabelCell>Aantal</LabelCell>
          <LabelCell>Eenheid</LabelCell>
          <LabelCell>Tarief</LabelCell>
          <LabelCell>Bedrag</LabelCell>
          <LabelCell />
        </div>
        {store.lines.map((line, index) => (
          <InvoiceLineRow
            key={line.id}
            line={line}
            index={index}
            totalLines={store.lines.length}
            onUpdate={store.updateLine}
            onRemove={store.removeLine}
            onMove={store.moveLine}
          />
        ))}
        <button
          type="button"
          onClick={store.addLine}
          style={{
            ...buttonSecondaryStyle,
            marginTop: 8,
          }}
        >
          + Regel toevoegen
        </button>
      </div>

      {/* VAT rate selector + totals */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <FieldGroup label="BTW-tarief">
          <select
            value={store.vatRate}
            onChange={(e) => store.setVatRate(Number(e.target.value) as VatRate)}
            style={{ ...inputStyle, width: 120 }}
          >
            <option value={21}>21%</option>
            <option value={9}>9%</option>
            <option value={0}>0%</option>
          </select>
        </FieldGroup>

        <div
          style={{
            textAlign: "right",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
          }}
        >
          <TotalRow label="Subtotaal" value={store.totals.subtotal} />
          <TotalRow
            label={`BTW (${store.vatRate}%)`}
            value={store.totals.vatAmount}
          />
          <div
            style={{
              borderTop: "0.5px solid var(--foreground)",
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <TotalRow label="Totaal" value={store.totals.total} bold />
          </div>
        </div>
      </div>

      {/* Notes */}
      <FieldGroup label="Notities (optioneel)">
        <textarea
          value={store.notes}
          onChange={(e) => store.setNotes(e.target.value)}
          rows={3}
          placeholder="Bijv. betalingsvoorwaarden, referentie..."
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </FieldGroup>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 32,
          paddingTop: 24,
          borderTop: "var(--border-rule)",
        }}
      >
        <ButtonSecondary onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "Opslaan..." : "Opslaan als concept"}
        </ButtonSecondary>
        <ButtonPrimary onClick={() => handleSave(true)} disabled={saving}>
          {saving ? "Opslaan..." : "Opslaan en preview"}
        </ButtonPrimary>
      </div>

      {store.lastSavedAt && (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-xs)",
            fontWeight: 300,
            opacity: 0.5,
            marginTop: 12,
          }}
        >
          Laatst opgeslagen: {new Date(store.lastSavedAt).toLocaleTimeString("nl-NL")}
        </p>
      )}
    </div>
  );
}

// ─── Reusable sub-components ───

function LabelCell({ children }: { children?: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-body-sm)",
        fontWeight: 500,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 32,
        padding: "4px 0",
        fontWeight: bold ? 500 : 300,
      }}
    >
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
        }).format(value)}
      </span>
    </div>
  );
}

// ─── Shared styles ───

const quickLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-sm)",
  fontWeight: 500,
  letterSpacing: "0.02em",
  marginBottom: 4,
};
