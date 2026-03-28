"use client";

import { useState } from "react";
import type { ReceiptInput } from "@/lib/types";
import {
  FieldGroup,
  inputStyle,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import { COMMON_VAT_RATES, COMMON_CURRENCIES } from "@/lib/constants/vat-rates";
import {
  getGroepen,
  getKostensoortenByGroep,
  KOSTENSOORTEN,
} from "@/lib/constants/costs";
import { formatCurrency } from "@/lib/format";

export interface BulkReceiptResult {
  receiptId: string;
  fileName: string;
  status: "success" | "error" | "processing";
  error?: string;
  aiData?: Partial<
    ReceiptInput & { cost_code: number | null; confidence: number }
  >;
}

interface BulkReceiptCardProps {
  result: BulkReceiptResult;
  onUpdate: (receiptId: string, data: Partial<ReceiptInput & { cost_code: number | null }>) => void;
}

export function BulkReceiptCard({ result, onUpdate }: BulkReceiptCardProps) {
  const [editing, setEditing] = useState(false);
  const [vendorName, setVendorName] = useState(
    result.aiData?.vendor_name ?? ""
  );
  const [receiptDate, setReceiptDate] = useState(
    result.aiData?.receipt_date ?? new Date().toISOString().split("T")[0]
  );
  const [amountExVat, setAmountExVat] = useState(
    result.aiData?.amount_ex_vat != null
      ? String(result.aiData.amount_ex_vat)
      : ""
  );
  const [vatRate, setVatRate] = useState(
    result.aiData?.vat_rate != null ? String(result.aiData.vat_rate) : "21"
  );
  const [costCode, setCostCode] = useState<number | null>(
    result.aiData?.cost_code ?? null
  );
  const [currency, setCurrency] = useState(
    result.aiData?.currency ?? "EUR"
  );

  const parsedAmount = parseFloat(amountExVat) || 0;
  const parsedVatRate = parseFloat(vatRate) || 0;
  const calculatedVat =
    Math.round(parsedAmount * (parsedVatRate / 100) * 100) / 100;
  const calculatedIncVat = Math.round((parsedAmount + calculatedVat) * 100) / 100;

  // Prefer AI-extracted amounts
  const computedVat = result.aiData?.vat_amount != null ? result.aiData.vat_amount : calculatedVat;
  const computedIncVat = result.aiData?.amount_inc_vat != null ? result.aiData.amount_inc_vat : calculatedIncVat;

  const confidence = result.aiData?.confidence ?? null;
  const category = costCode
    ? KOSTENSOORTEN.find((k) => k.code === costCode)?.label ?? "Overig"
    : "Overig";

  const groepen = getGroepen();
  const isPdf = result.fileName.toLowerCase().endsWith(".pdf");

  const handleSave = () => {
    onUpdate(result.receiptId, {
      vendor_name: vendorName || null,
      amount_ex_vat: parsedAmount,
      vat_rate: parsedVatRate,
      currency,
      category,
      cost_code: costCode,
      receipt_date: receiptDate,
    });
    setEditing(false);
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
        <span style={{ fontSize: 14, opacity: 0.4 }}>{isPdf ? "📄" : "📷"}</span>
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
          {result.error ?? "Fout bij verwerking"}
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
        <span style={{ fontSize: 14, opacity: 0.4 }}>{isPdf ? "📄" : "📷"}</span>
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
        border:
          confidence !== null && confidence < 0.7
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
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.4 }}>{isPdf ? "📄" : "📷"}</span>
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            minWidth: 120,
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
          {vendorName || "—"}
        </span>
        <span
          className="mono-amount"
          style={{ fontSize: "var(--text-body-sm)" }}
        >
          {receiptDate}
        </span>
        <span
          className="mono-amount"
          style={{
            fontSize: "var(--text-body-sm)",
            minWidth: 80,
            textAlign: "right",
          }}
        >
          {formatCurrency(computedIncVat, currency)}
        </span>
        {confidence !== null && (
          <span
            style={{
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              opacity: confidence < 0.7 ? 0.8 : 0.3,
              color:
                confidence < 0.7 ? "var(--color-warning, #b45309)" : "inherit",
              minWidth: 40,
              textAlign: "right",
            }}
          >
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
          {editing ? "Sluiten" : "Bewerken"}
        </button>
      </div>

      {/* Expandable edit form */}
      {editing && (
        <div style={{ marginTop: 16, maxWidth: 500 }}>
          <FieldGroup label="Datum">
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label="Leverancier">
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Naam leverancier"
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label="Kostensoort">
            <select
              value={costCode ?? ""}
              onChange={(e) =>
                setCostCode(e.target.value ? Number(e.target.value) : null)
              }
              style={inputStyle}
            >
              <option value="">— Selecteer —</option>
              {groepen.map((groep) => (
                <optgroup
                  key={groep}
                  label={groep}
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    fontWeight: 700,
                  }}
                >
                  {getKostensoortenByGroep(groep).map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Bedrag excl. BTW">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountExVat}
              onChange={(e) => setAmountExVat(e.target.value)}
              placeholder="0,00"
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label="Valuta">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={inputStyle}
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="BTW-tarief">
            <select
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              style={inputStyle}
            >
              {COMMON_VAT_RATES.map((vr) => (
                <option key={`${vr.rate}-${vr.country}`} value={String(vr.rate)}>
                  {vr.label}
                </option>
              ))}
              {vatRate && !COMMON_VAT_RATES.some((vr) => String(vr.rate) === vatRate) && (
                <option value={vatRate}>{vatRate}% (gedetecteerd)</option>
              )}
            </select>
          </FieldGroup>

          <p
            style={{
              fontSize: "var(--text-mono-sm)",
              fontWeight: 400,
              margin: "0 0 16px",
              opacity: 0.5,
            }}
          >
            BTW: {formatCurrency(computedVat, currency)} | Incl. BTW:{" "}
            {formatCurrency(computedIncVat, currency)}
          </p>

          <ButtonSecondary onClick={handleSave}>Opslaan</ButtonSecondary>
        </div>
      )}
    </div>
  );
}
