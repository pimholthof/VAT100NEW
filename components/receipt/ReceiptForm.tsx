"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReceipt, updateReceipt } from "@/lib/actions/receipts";
import type { Receipt, ReceiptInput } from "@/lib/types";

const CATEGORIES = [
  "Kantoor",
  "Reizen & vervoer",
  "Software & abonnementen",
  "Marketing",
  "Apparatuur",
  "Eten & drinken",
  "Overig",
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface ReceiptFormProps {
  receipt?: Receipt;
  onSaved?: () => void;
}

export function ReceiptForm({ receipt, onSaved }: ReceiptFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [receiptDate, setReceiptDate] = useState(receipt?.receipt_date ?? today);
  const [vendorName, setVendorName] = useState(receipt?.vendor_name ?? "");
  const [category, setCategory] = useState(receipt?.category ?? "Overig");
  const [amountExVat, setAmountExVat] = useState(
    receipt?.amount_ex_vat != null ? String(receipt.amount_ex_vat) : ""
  );
  const [vatRate, setVatRate] = useState(
    receipt?.vat_rate != null ? String(receipt.vat_rate) : "21"
  );

  const parsedAmount = parseFloat(amountExVat) || 0;
  const parsedVatRate = parseFloat(vatRate) || 0;
  const computedVat = Math.round(parsedAmount * (parsedVatRate / 100) * 100) / 100;
  const computedIncVat = Math.round((parsedAmount + computedVat) * 100) / 100;

  const handleSubmit = async () => {
    if (!receiptDate) {
      setError("Datum is verplicht.");
      return;
    }

    setSaving(true);
    setError(null);

    const input: ReceiptInput = {
      vendor_name: vendorName || null,
      amount_ex_vat: parsedAmount,
      vat_rate: parsedVatRate,
      category,
      receipt_date: receiptDate,
    };

    const result = receipt
      ? await updateReceipt(receipt.id, input)
      : await createReceipt(input);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    if (onSaved) {
      onSaved();
    } else if (result.data) {
      router.push(`/dashboard/receipts/${result.data.id}`);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {error && (
        <div
          style={{
            padding: "12px 16px",
            border: "none",
            borderLeft: "2px solid var(--foreground)",
            marginBottom: 24,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          {error}
        </div>
      )}

      <FieldGroup label="Datum *">
        <input
          type="date"
          value={receiptDate}
          onChange={(e) => setReceiptDate(e.target.value)}
          required
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

      <FieldGroup label="Categorie">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Bedrag excl. BTW">
        <input
          type="number"
          step="0.01"
          value={amountExVat}
          onChange={(e) => setAmountExVat(e.target.value)}
          placeholder="0,00"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="BTW-tarief">
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
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-md)",
          fontWeight: 400,
          margin: "0 0 24px",
          padding: "12px 16px",
          border: "none",
          borderTop: "var(--border-rule)",
          borderBottom: "var(--border-rule)",
        }}
      >
        BTW: {formatCurrency(computedVat)} | Incl. BTW: {formatCurrency(computedIncVat)}
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 32,
          paddingTop: 24,
          borderTop: "var(--border-rule)",
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={buttonSecondaryStyle}
        >
          Annuleer
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          style={buttonPrimaryStyle}
        >
          {saving ? "Opslaan..." : "Bon opslaan"}
        </button>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-xs)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 2px",
  border: "none",
  borderBottom: "var(--border-input)",
  background: "transparent",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
};

const buttonPrimaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-lg)",
  fontWeight: 500,
  letterSpacing: "var(--tracking-caps)",
  textTransform: "uppercase",
  padding: "12px 20px",
  border: "none",
  background: "var(--foreground)",
  color: "var(--background)",
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 500,
  letterSpacing: "var(--tracking-caps)",
  textTransform: "uppercase",
  padding: "10px 16px",
  border: "1px solid rgba(13, 13, 11, 0.2)",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
};
