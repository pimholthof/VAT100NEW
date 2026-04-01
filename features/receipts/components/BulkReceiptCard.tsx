"use client";

import { useState } from "react";
import type { ReceiptInput } from "@/lib/types";
import {
  FieldGroup,
  inputStyle,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import {
  getGroepen,
  getKostensoortenByGroep,
  KOSTENSOORTEN,
} from "@/lib/constants/costs";
import { formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";

export interface BulkReceiptResult {
  receiptId: string;
  fileName: string;
  status: "success" | "error" | "processing";
  error?: string;
  aiError?: string;
  aiData?: Partial<
    ReceiptInput & { cost_code: number | null; confidence: number }
  >;
}

interface BulkReceiptCardProps {
  result: BulkReceiptResult;
  onUpdate: (receiptId: string, data: Partial<ReceiptInput & { cost_code: number | null }>) => void;
}

export function BulkReceiptCard({ result, onUpdate }: BulkReceiptCardProps) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(!!result.aiError);
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

  const parsedAmount = parseFloat(amountExVat) || 0;
  const parsedVatRate = parseFloat(vatRate) || 0;
  const computedVat =
    Math.round(parsedAmount * (parsedVatRate / 100) * 100) / 100;
  const computedIncVat = Math.round((parsedAmount + computedVat) * 100) / 100;

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
          {result.error ?? t.dashboard.processingError}
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
          {formatCurrency(computedIncVat)}
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
          {editing ? t.receipts.closeEdit : t.receipts.editReceipt}
        </button>
      </div>

      {/* AI scan unavailable hint */}
      {result.aiError && !editing && (
        <p
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 400,
            margin: "8px 0 0",
            opacity: 0.45,
            paddingLeft: 26,
          }}
        >
          {t.dashboard.aiScanUnavailable}
        </p>
      )}

      {/* Expandable edit form */}
      {editing && (
        <div style={{ marginTop: 16, maxWidth: 500 }}>
          <FieldGroup label={t.common.date}>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label={t.receipts.vendorLabel}>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder={t.receipts.vendorPlaceholder}
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label={t.receipts.costTypeLabel}>
            <select
              value={costCode ?? ""}
              onChange={(e) =>
                setCostCode(e.target.value ? Number(e.target.value) : null)
              }
              style={inputStyle}
            >
              <option value="">{t.receipts.selectCategory}</option>
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

          <FieldGroup label={t.receipts.amountExVat}>
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

          <FieldGroup label={t.receipts.vatRateLabel}>
            <select
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              style={inputStyle}
            >
              <option value="21">21%</option>
              <option value="9">9%</option>
              <option value="0">0%</option>
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
            {t.receipts.vatLabel} {formatCurrency(computedVat)} | {t.receipts.incVatLabel}{" "}
            {formatCurrency(computedIncVat)}
          </p>

          <ButtonSecondary onClick={handleSave}>{t.common.save}</ButtonSecondary>
        </div>
      )}
    </div>
  );
}
