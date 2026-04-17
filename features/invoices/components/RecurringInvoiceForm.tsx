"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getClients } from "@/features/clients/actions";
import {
  createRecurringInvoice,
  updateRecurringInvoice,
} from "@/features/invoices/recurring-actions";
import type {
  RecurringInvoiceWithDetails,
  InvoiceLineInput,
  RecurringFrequency,
  VatRate,
} from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useToast, ButtonPrimary, ButtonSecondary } from "@/components/ui";

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly", label: "Wekelijks" },
  { value: "monthly", label: "Maandelijks" },
  { value: "quarterly", label: "Per kwartaal" },
  { value: "yearly", label: "Jaarlijks" },
];

const VAT_OPTIONS: { value: VatRate; label: string }[] = [
  { value: 21, label: "21%" },
  { value: 9, label: "9%" },
  { value: 0, label: "0%" },
];

interface RecurringInvoiceFormProps {
  existing?: RecurringInvoiceWithDetails;
  onSaved: () => void;
  onCancel: () => void;
}

function emptyLine(): InvoiceLineInput {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "uren",
    rate: 0,
  };
}

export function RecurringInvoiceForm({
  existing,
  onSaved,
  onCancel,
}: RecurringInvoiceFormProps) {
  const { toast } = useToast();

  const [clientId, setClientId] = useState(existing?.client_id ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    existing?.frequency ?? "monthly"
  );
  const [nextRunDate, setNextRunDate] = useState(
    existing?.next_run_date ?? new Date().toISOString().split("T")[0]
  );
  const [vatRate, setVatRate] = useState<VatRate>(
    (existing?.vat_rate ?? 21) as VatRate
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [autoSend, setAutoSend] = useState(existing?.auto_send ?? false);
  const [lines, setLines] = useState<InvoiceLineInput[]>(
    existing?.lines?.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      rate: l.rate,
    })) ?? [emptyLine()]
  );
  const [error, setError] = useState<string | null>(null);

  const { data: clientsResult } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  const clients = clientsResult?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        client_id: clientId,
        frequency,
        next_run_date: nextRunDate,
        vat_rate: vatRate,
        notes: notes || null,
        is_active: isActive,
        auto_send: autoSend,
        lines,
      };
      if (existing) {
        return updateRecurringInvoice(existing.id, input);
      }
      return createRecurringInvoice(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error);
        return;
      }
      toast(existing ? "Template bijgewerkt" : "Template aangemaakt");
      onSaved();
    },
  });

  const updateLine = (index: number, field: keyof InvoiceLineInput, value: string | number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.rate || 0),
    0
  );
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  return (
    <div>
      <div className="page-header">
        <h1 className="display-title">
          {existing ? "Template bewerken" : "Nieuwe terugkerende factuur"}
        </h1>
        <button onClick={onCancel} className="btn-secondary">
          Annuleren
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(255,0,0,0.05)",
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 13,
            color: "var(--color-accent)",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="glass"
        style={{ padding: 32, borderRadius: 16, marginBottom: 24 }}
      >
        {/* Client selection */}
        <div style={{ marginBottom: 24 }}>
          <label
            className="label"
            style={{ display: "block", marginBottom: 8, opacity: 0.5 }}
          >
            KLANT
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input"
            style={{ width: "100%" }}
          >
            <option value="">Selecteer klant</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Frequency + next run date + VAT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <label
              className="label"
              style={{ display: "block", marginBottom: 8, opacity: 0.5 }}
            >
              FREQUENTIE
            </label>
            <select
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as RecurringFrequency)
              }
              className="input"
              style={{ width: "100%" }}
            >
              {FREQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="label"
              style={{ display: "block", marginBottom: 8, opacity: 0.5 }}
            >
              VOLGENDE FACTUURDATUM
            </label>
            <input
              type="date"
              value={nextRunDate}
              onChange={(e) => setNextRunDate(e.target.value)}
              className="input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label
              className="label"
              style={{ display: "block", marginBottom: 8, opacity: 0.5 }}
            >
              BTW-TARIEF
            </label>
            <select
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
              className="input"
              style={{ width: "100%" }}
            >
              {VAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 24,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Actief
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
            />
            Automatisch versturen
          </label>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label
            className="label"
            style={{ display: "block", marginBottom: 8, opacity: 0.5 }}
          >
            NOTITIES
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
            placeholder="Optionele notitie op de factuur"
          />
        </div>
      </div>

      {/* Lines */}
      <div
        className="glass"
        style={{ padding: 32, borderRadius: 16, marginBottom: 24 }}
      >
        <h3
          className="label"
          style={{ marginBottom: 16, opacity: 0.5 }}
        >
          FACTUURREGELS
        </h3>
        {lines.map((line, i) => (
          <div
            key={line.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 80px 80px 100px 40px",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={line.description}
              onChange={(e) => updateLine(i, "description", e.target.value)}
              className="input"
              placeholder="Omschrijving"
            />
            <input
              type="number"
              value={line.quantity}
              onChange={(e) =>
                updateLine(i, "quantity", Number(e.target.value))
              }
              className="input"
              min={0}
              step={0.5}
              placeholder="Aantal"
            />
            <select
              value={line.unit}
              onChange={(e) => updateLine(i, "unit", e.target.value)}
              className="input"
            >
              <option value="uren">Uren</option>
              <option value="dagen">Dagen</option>
              <option value="stuks">Stuks</option>
            </select>
            <input
              type="number"
              value={line.rate}
              onChange={(e) =>
                updateLine(i, "rate", Number(e.target.value))
              }
              className="input"
              min={0}
              step={0.01}
              placeholder="Tarief"
            />
            {lines.length > 1 && (
              <button
                onClick={() => removeLine(i)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  opacity: 0.3,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setLines((prev) => [...prev, emptyLine()])}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            opacity: 0.5,
            marginTop: 8,
          }}
        >
          + Regel toevoegen
        </button>
      </div>

      {/* Totals */}
      <div
        className="glass"
        style={{
          padding: "20px 32px",
          borderRadius: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 32,
            fontSize: 14,
          }}
        >
          <span style={{ opacity: 0.4 }}>
            Excl. BTW: {formatCurrency(subtotal)}
          </span>
          <span style={{ opacity: 0.4 }}>
            BTW: {formatCurrency(vatAmount)}
          </span>
          <span style={{ fontWeight: 600 }}>
            Totaal: {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <ButtonSecondary onClick={onCancel} disabled={saveMutation.isPending}>
          Annuleren
        </ButtonSecondary>
        <ButtonPrimary
          onClick={() => saveMutation.mutate()}
          disabled={!clientId}
          loading={saveMutation.isPending}
        >
          {existing ? "Bijwerken" : "Template aanmaken"}
        </ButtonPrimary>
      </div>
    </div>
  );
}
