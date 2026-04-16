"use client";

import { useState } from "react";
import type { InvoiceOCRData } from "../types/invoice-ocr";
import type { Client, InvoiceUnit, VatRate, VatScheme } from "@/lib/types";
import { FieldGroup, ButtonSecondary, ErrorMessage } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";

export interface BulkInvoiceResult {
  invoiceId: string;
  fileName: string;
  status: "success" | "error" | "processing";
  error?: string;
  aiError?: string;
  aiData?: InvoiceOCRData;
  clientMatch?: { id: string; name: string; isNew: boolean };
}

export interface InvoiceEditData {
  client_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  vat_rate: VatRate;
  vat_scheme: VatScheme;
  notes: string;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: InvoiceUnit;
    rate: number;
  }>;
}

interface BulkInvoiceCardProps {
  result: BulkInvoiceResult;
  index: number;
  clients: Client[];
  onUpdate: (index: number, data: InvoiceEditData) => void;
}

export function BulkInvoiceCard({
  result,
  index,
  clients,
  onUpdate,
}: BulkInvoiceCardProps) {
  const { t } = useLocale();
  const isManual = result.aiError === "manual";
  const [editing, setEditing] = useState(isManual || !!result.aiError);

  const [clientId, setClientId] = useState(result.clientMatch?.id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    result.aiData?.invoice_number ?? ""
  );
  const [issueDate, setIssueDate] = useState(
    result.aiData?.issue_date ?? new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(result.aiData?.due_date ?? "");
  const [vatRate, setVatRate] = useState<VatRate>(
    result.aiData?.vat_rate ?? 21
  );
  const [vatScheme, setVatScheme] = useState<VatScheme>(
    result.aiData?.vat_scheme ?? "standard"
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState(
    result.aiData?.lines && result.aiData.lines.length > 0
      ? result.aiData.lines.map((l) => ({
          id: crypto.randomUUID(),
          ...l,
        }))
      : [
          {
            id: crypto.randomUUID(),
            description: "",
            quantity: 1,
            unit: "uren" as InvoiceUnit,
            rate: 0,
          },
        ]
  );

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const totalIncVat = Math.round((subtotal + vatAmount) * 100) / 100;

  const confidence = result.aiData?.confidence ?? null;
  const requiresReview = result.aiData?.requires_review ?? false;
  const isPdf = result.fileName.toLowerCase().endsWith(".pdf");

  const handleSave = () => {
    onUpdate(index, {
      client_id: clientId || null,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      vat_rate: vatRate,
      vat_scheme: vatScheme,
      notes,
      lines,
    });
    setEditing(false);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit: "uren" as InvoiceUnit,
        rate: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (
    id: string,
    field: string,
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  if (result.status === "error") {
    return (
      <div
        style={{
          padding: "16px 20px",
          border: "0.5px solid rgba(165,28,48,0.3)",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.4 }}>
          {isPdf ? "\u{1F4C4}" : "\u{1F4F7}"}
        </span>
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            flex: 1,
          }}
        >
          {result.fileName}
        </span>
        <ErrorMessage style={{ margin: 0, fontSize: "var(--text-body-sm)" }}>
          {result.error ?? "Verwerkingsfout"}
        </ErrorMessage>
      </div>
    );
  }

  if (result.status === "processing") {
    return (
      <div
        style={{
          padding: "16px 20px",
          border: "0.5px solid rgba(13,13,11,0.08)",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.4 }}>
          {isPdf ? "\u{1F4C4}" : "\u{1F4F7}"}
        </span>
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            flex: 1,
          }}
        >
          {result.fileName}
        </span>
        <span
          className="skeleton"
          style={{ width: 60, height: 14, display: "inline-block" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px 20px",
        border: requiresReview
          ? "0.5px solid rgba(180,83,9,0.4)"
          : "0.5px solid rgba(13,13,11,0.08)",
        marginBottom: 8,
      }}
    >
      {/* Summary row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.4 }}>
          {isManual ? "\u{270F}\u{FE0F}" : isPdf ? "\u{1F4C4}" : "\u{1F4F7}"}
        </span>
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            minWidth: 100,
            opacity: 0.5,
          }}
        >
          {result.fileName}
        </span>
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 500,
            flex: 1,
          }}
        >
          {result.clientMatch?.name ?? result.aiData?.client_name ?? "\u2014"}
          {result.clientMatch && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.5,
                color: result.clientMatch.isNew
                  ? "rgba(0,128,0,0.7)"
                  : "inherit",
              }}
            >
              {result.clientMatch.isNew ? "Nieuw" : "Bestaand"}
            </span>
          )}
        </span>
        {!isManual && (
          <>
            <span
              className="mono-amount"
              style={{
                fontSize: "var(--text-body-sm)",
                opacity: 0.5,
              }}
            >
              {invoiceNumber || "\u2014"}
            </span>
            <span
              className="mono-amount"
              style={{ fontSize: "var(--text-body-sm)", opacity: 0.4 }}
            >
              {issueDate}
            </span>
            <span
              className="mono-amount"
              style={{
                fontSize: "var(--text-body-sm)",
                minWidth: 80,
                textAlign: "right",
              }}
            >
              {formatCurrency(totalIncVat)}
            </span>
          </>
        )}
        {confidence !== null && (
          <span
            style={{
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              opacity: requiresReview ? 0.8 : 0.3,
              color: requiresReview
                ? "var(--color-warning, #b45309)"
                : "inherit",
              minWidth: 40,
              textAlign: "right",
            }}
            title={
              requiresReview
                ? "Lage AI-zekerheid \u2014 controleer alle velden voor je opslaat."
                : undefined
            }
          >
            {requiresReview ? "Controle " : ""}
            {Math.round(confidence * 100)}%
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            opacity: 0.4,
            padding: "4px 0",
          }}
        >
          {editing ? t.invoices.importCloseEdit : t.invoices.importEditInvoice}
        </button>
      </div>

      {/* AI scan unavailable hint */}
      {result.aiError && result.aiError !== "manual" && !editing && (
        <p
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 400,
            margin: "8px 0 0",
            opacity: 0.45,
            paddingLeft: 26,
          }}
        >
          AI-scan niet beschikbaar — vul de gegevens handmatig in.
        </p>
      )}

      {/* Expandable edit form */}
      {editing && (
        <div style={{ marginTop: 16, maxWidth: 600 }}>
          <FieldGroup label={t.invoices.client}>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="form-input"
            >
              <option value="">{t.invoices.selectClientPlaceholder}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FieldGroup>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FieldGroup label={t.invoices.invoiceNumber}>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Wordt automatisch gegenereerd"
                className="form-input"
              />
            </FieldGroup>

            <FieldGroup label={t.invoices.issueDate}>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="form-input"
              />
            </FieldGroup>

            <FieldGroup label={t.invoices.dueDate}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input"
              />
            </FieldGroup>

            <FieldGroup label={t.invoices.vatRate}>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
                className="form-input"
              >
                <option value={21}>{t.invoices.vatHigh}</option>
                <option value={9}>{t.invoices.vatLow}</option>
                <option value={0}>{t.invoices.vatZero}</option>
              </select>
            </FieldGroup>
          </div>

          <FieldGroup label="BTW-regeling">
            <select
              value={vatScheme}
              onChange={(e) => setVatScheme(e.target.value as VatScheme)}
              className="form-input"
            >
              <option value="standard">Standaard</option>
              <option value="eu_reverse_charge">
                {t.invoices.euReverseCharge}
              </option>
              <option value="export_outside_eu">
                {t.invoices.exportOutsideEu}
              </option>
            </select>
          </FieldGroup>

          <FieldGroup label={t.invoices.notes}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
              rows={2}
              style={{ resize: "vertical" }}
            />
          </FieldGroup>

          {/* Line items */}
          <div style={{ marginTop: 16 }}>
            <p
              style={{
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                opacity: 0.4,
                margin: "0 0 12px",
              }}
            >
              {t.invoices.importLineItems}
            </p>

            {lines.map((line) => (
              <div
                key={line.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 100px auto",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "end",
                }}
              >
                <FieldGroup label={t.invoices.lineDescription}>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(line.id, "description", e.target.value)
                    }
                    placeholder={t.invoices.descriptionPlaceholder}
                    className="form-input"
                  />
                </FieldGroup>
                <FieldGroup label={t.invoices.quantity}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(
                        line.id,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="form-input"
                  />
                </FieldGroup>
                <FieldGroup label="Eenheid">
                  <select
                    value={line.unit}
                    onChange={(e) =>
                      updateLine(line.id, "unit", e.target.value)
                    }
                    className="form-input"
                  >
                    <option value="uren">{t.invoices.unitHours}</option>
                    <option value="dagen">{t.invoices.unitDays}</option>
                    <option value="stuks">{t.invoices.unitPieces}</option>
                  </select>
                </FieldGroup>
                <FieldGroup label={t.invoices.rate}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.rate}
                    onChange={(e) =>
                      updateLine(
                        line.id,
                        "rate",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="form-input"
                  />
                </FieldGroup>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "var(--text-label)",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      opacity: 0.3,
                      padding: "8px 0",
                      marginBottom: 12,
                    }}
                  >
                    {t.invoices.importRemoveLine}
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addLine}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--text-body-sm)",
                fontWeight: 400,
                opacity: 0.5,
                padding: "4px 0",
              }}
            >
              {t.invoices.importAddLine}
            </button>
          </div>

          <p
            style={{
              fontSize: "var(--text-mono-sm)",
              fontWeight: 400,
              margin: "16px 0",
              opacity: 0.5,
            }}
          >
            {t.invoices.exVatLabel} {formatCurrency(subtotal)} |{" "}
            {t.invoices.vatAmountLabel} {formatCurrency(vatAmount)} |{" "}
            {t.invoices.totalIncVat}: {formatCurrency(totalIncVat)}
          </p>

          <ButtonSecondary onClick={handleSave}>
            {t.common.save}
          </ButtonSecondary>
        </div>
      )}
    </div>
  );
}
