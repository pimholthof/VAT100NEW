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

  const clientId = useInvoiceStore((s) => s.clientId);
  const setClientId = useInvoiceStore((s) => s.setClientId);
  const invoiceNumber = useInvoiceStore((s) => s.invoiceNumber);
  const setInvoiceNumber = useInvoiceStore((s) => s.setInvoiceNumber);
  const issueDate = useInvoiceStore((s) => s.issueDate);
  const setIssueDate = useInvoiceStore((s) => s.setIssueDate);
  const dueDate = useInvoiceStore((s) => s.dueDate);
  const setDueDate = useInvoiceStore((s) => s.setDueDate);
  const vatRate = useInvoiceStore((s) => s.vatRate);
  const setVatRate = useInvoiceStore((s) => s.setVatRate);
  const notes = useInvoiceStore((s) => s.notes);
  const setNotes = useInvoiceStore((s) => s.setNotes);
  const lines = useInvoiceStore((s) => s.lines);
  const addLine = useInvoiceStore((s) => s.addLine);
  const updateLine = useInvoiceStore((s) => s.updateLine);
  const removeLine = useInvoiceStore((s) => s.removeLine);
  const moveLine = useInvoiceStore((s) => s.moveLine);
  const totals = useInvoiceStore((s) => s.totals);
  const lastSavedAt = useInvoiceStore((s) => s.lastSavedAt);
  const markSaved = useInvoiceStore((s) => s.markSaved);
  const toInput = useInvoiceStore((s) => s.toInput);

  const { data: clientsResult } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  const clients = clientsResult?.data ?? [];

  // Generate invoice number for new invoices
  useEffect(() => {
    if (!invoiceId && !invoiceNumber) {
      generateInvoiceNumber().then((result) => {
        if (result.data) {
          setInvoiceNumber(result.data);
        }
      });
    }
  }, [invoiceId, invoiceNumber, setInvoiceNumber]);

  // Auto-save draft every 30 seconds
  const handleAutoSave = useCallback(async () => {
    const s = useInvoiceStore.getState();
    if (!s.isDirty || !s.clientId || !s.invoiceNumber) return;

    if (invoiceId) {
      await updateInvoice(invoiceId, s.toInput("draft"));
    } else {
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
    if (!clientId) {
      setError("Selecteer een klant.");
      return;
    }
    if (!invoiceNumber) {
      setError("Factuurnummer is verplicht.");
      return;
    }

    setSaving(true);
    setError(null);

    const status = andPreview ? "sent" : "draft";
    const input = toInput(status as "draft" | "sent");

    let result;
    if (invoiceId) {
      result = await updateInvoice(invoiceId, input);
      if (!result.error) {
        markSaved();
        if (andPreview) {
          router.push(`/dashboard/invoices/${invoiceId}/preview`);
        }
      }
    } else {
      result = await createInvoice(input);
      if (!result.error && result.data) {
        markSaved();
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
      setClientId(result.data.id);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientAddress("");
      setNewClientCity("");
      setNewClientPostalCode("");
      setShowNewClient(false);
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
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Selecteer klant —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ButtonSecondary
            type="button"
            onClick={() => setShowNewClient(!showNewClient)}
          >
            {showNewClient ? "Annuleer" : "+ Nieuw"}
          </ButtonSecondary>
        </div>
      </FieldGroup>

      {/* Slide-in new client panel */}
      {showNewClient && (
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
            <ButtonPrimary
              type="button"
              onClick={handleCreateQuickClient}
            >
              Klant aanmaken
            </ButtonPrimary>
            <ButtonSecondary
              type="button"
              onClick={() => setShowNewClient(false)}
              style={{ opacity: 0.4 }}
            >
              Annuleer
            </ButtonSecondary>
          </div>
        </div>
      )}

      {/* Invoice number + dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <FieldGroup label="Factuurnummer">
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
          />
        </FieldGroup>
        <FieldGroup label="Factuurdatum">
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
          />
        </FieldGroup>
        <FieldGroup label="Vervaldatum">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ ...inputStyle, fontFamily: "var(--font-mono), monospace" }}
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
        {lines.map((line, index) => (
          <InvoiceLineRow
            key={line.id}
            line={line}
            index={index}
            totalLines={lines.length}
            onUpdate={updateLine}
            onRemove={removeLine}
            onMove={moveLine}
          />
        ))}
        <ButtonSecondary
          type="button"
          onClick={addLine}
          style={{ marginTop: 8 }}
        >
          + Regel toevoegen
        </ButtonSecondary>
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
            value={vatRate}
            onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
            style={{ ...inputStyle, width: 120 }}
          >
            <option value={21}>21%</option>
            <option value={9}>9%</option>
            <option value={0}>0%</option>
          </select>
        </FieldGroup>

        <div style={{ textAlign: "right" }}>
          <TotalRow label="Subtotaal" value={totals.subtotal} />
          <TotalRow
            label={`BTW (${vatRate}%)`}
            value={totals.vatAmount}
          />
          <div
            style={{
              borderTop: "0.5px solid var(--foreground)",
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <TotalRow label="Totaal" value={totals.total} bold />
          </div>
        </div>
      </div>

      {/* Notes */}
      <FieldGroup label="Notities (optioneel)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Bijv. betalingsvoorwaarden, referentie..."
          style={{
            ...inputStyle,
            border: "0.5px solid rgba(13,13,11,0.12)",
            padding: 12,
            resize: "vertical",
          }}
        />
      </FieldGroup>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 32,
          paddingTop: 24,
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        <ButtonSecondary onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "Opslaan..." : "Opslaan als concept"}
        </ButtonSecondary>
        <ButtonPrimary onClick={() => handleSave(true)} disabled={saving}>
          {saving ? "Opslaan..." : "Opslaan en preview"}
        </ButtonPrimary>
      </div>

      {lastSavedAt && (
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-sm)",
            fontWeight: 300,
            opacity: 0.35,
            marginTop: 12,
          }}
        >
          Laatst opgeslagen: {new Date(lastSavedAt).toLocaleTimeString("nl-NL")}
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
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: 0.4,
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
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "11px",
          fontWeight: 300,
          opacity: bold ? 1 : 0.4,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: bold ? "14px" : "12px",
          fontWeight: bold ? 500 : 400,
          fontVariantNumeric: "tabular-nums",
        }}
      >
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
  fontSize: "var(--text-label)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 8,
  opacity: 0.4,
};
