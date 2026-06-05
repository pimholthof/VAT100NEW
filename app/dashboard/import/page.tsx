"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { previewImportCSV, importInvoices, importReceipts, importClients, suggestColumnMapping } from "@/features/import/actions";
import { TARGET_FIELDS, type ImportPreview, type ImportType } from "@/features/import/parse";
import { Th, Td } from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "0.5px solid rgba(13,13,11,0.2)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-body)",
  fontFamily: "inherit",
  background: "transparent",
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--foreground)" : "2px solid transparent",
  padding: "0 0 8px 0",
  fontSize: "var(--text-body-lg)",
  fontWeight: active ? 500 : 300,
  color: "var(--foreground)",
  opacity: active ? 1 : 0.5,
  cursor: "pointer",
});

export default function ImportPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState<ImportType>("clients");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewMut = useMutation({
    mutationFn: (text: string) => previewImportCSV(text, tab),
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setPreview(res.data!);
      setMapping(res.data!.mapping);
      setError(null);
      setResult(null);
    },
  });

  const importMut = useMutation({
    mutationFn: () => {
      if (tab === "invoices") return importInvoices(csvText, mapping);
      if (tab === "clients") return importClients(csvText, mapping);
      return importReceipts(csvText, mapping);
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setResult(res.data!);
      setError(null);
    },
  });

  // Slimme kolom-herkenning (onder de motorkap) voor onbekende exports.
  const suggestMut = useMutation({
    mutationFn: () => {
      const p = preview!;
      const sampleRows = p.preview.map((r) => p.headers.map((h) => r[h] ?? ""));
      return suggestColumnMapping(p.headers, tab, sampleRows);
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setMapping((m) => ({ ...m, ...res.data }));
      setError(null);
    },
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      previewMut.mutate(text);
    };
    reader.readAsText(file);
  }

  function handleTabChange(newTab: ImportType) {
    setTab(newTab);
    setPreview(null);
    setMapping({});
    setError(null);
    setResult(null);
    setCsvText("");
  }

  const targetFields = TARGET_FIELDS[tab].map((f) => f.field);
  const unmappedCount = preview ? preview.headers.filter((h) => !mapping[h]).length : 0;

  const targetLabels: Record<string, string> = {
    invoice_number: t.import.fieldInvoiceNumber,
    client_name: t.import.fieldClientName,
    issue_date: t.import.fieldIssueDate,
    due_date: t.import.fieldDueDate,
    subtotal_ex_vat: t.import.fieldAmountExVat,
    vat_amount: t.import.fieldVatAmount,
    total_inc_vat: t.import.fieldAmountIncVat,
    description: t.import.fieldDescription,
    status: t.import.fieldStatus,
    vendor_name: t.import.fieldVendorName,
    receipt_date: t.import.fieldReceiptDate,
    amount_ex_vat: t.import.fieldAmountExVat,
    amount_inc_vat: t.import.fieldAmountIncVat,
    category: t.import.fieldCategory,
    name: t.import.fieldName,
    contact_name: t.import.fieldContactName,
    email: t.import.fieldEmail,
    address: t.import.fieldAddress,
    postal_code: t.import.fieldPostalCode,
    city: t.import.fieldCity,
    country: t.import.fieldCountry,
    kvk_number: t.import.fieldKvkNumber,
    btw_number: t.import.fieldBtwNumber,
    payment_terms_days: t.import.fieldPaymentTerms,
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="display-title">{t.import.title}</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            {t.import.subtitleCSV}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "40px", borderBottom: "0.5px solid rgba(13,13,11,0.12)" }}>
        <button onClick={() => handleTabChange("clients")} style={tabStyle(tab === "clients")}>{t.import.clientsTab}</button>
        <button onClick={() => handleTabChange("invoices")} style={tabStyle(tab === "invoices")}>{t.import.invoicesTab}</button>
        <button onClick={() => handleTabChange("receipts")} style={tabStyle(tab === "receipts")}>{t.import.receiptsTab}</button>
      </div>

      {/* Success */}
      {result && (
        <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 32, border: "1px solid var(--color-success)" }}>
          <p style={{ fontWeight: 600, color: "var(--color-success)" }}>
            {t.import.importComplete} {result.imported} {t.import.imported}
            {result.skipped > 0 && `, ${result.skipped} ${t.import.skipped}`}
          </p>
        </div>
      )}

      {error && <p style={{ color: "var(--color-accent)", marginBottom: 16 }}>{error}</p>}

      {/* Stap 1: Upload */}
      {!preview && !result && (
        <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)" }}>
          <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 8 }}>
            {t.import.step1}
          </h3>
          <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
            {t.import.step1Desc}
          </p>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="label-strong"
                style={{
                  padding: "14px 24px",
                  border: "0.5px solid rgba(13,13,11,0.25)",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {t.import.chooseFile}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 8 }}>{t.import.pasteCSV}</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={t.import.pastePlaceholder}
              style={{ ...inputStyle, height: 120, fontFamily: "var(--font-mono)", fontSize: 13 }}
            />
            <button
              onClick={() => csvText.trim() && previewMut.mutate(csvText)}
              disabled={!csvText.trim() || previewMut.isPending}
              className="label-strong"
              style={{
                marginTop: 8,
                padding: "10px 20px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: csvText.trim() ? "pointer" : "default",
                opacity: csvText.trim() ? 1 : 0.3,
              }}
            >
              {previewMut.isPending ? t.import.processing : t.import.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* Stap 2: Mapping + Preview */}
      {preview && !result && (
        <>
          <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)", marginBottom: 32 }}>
            <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 8 }}>
              {t.import.step2}
            </h3>
            <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
              {preview.totalRows} {t.import.rowsFound}
            </p>

            {unmappedCount > 0 && (
              <button
                onClick={() => suggestMut.mutate()}
                disabled={suggestMut.isPending}
                style={{
                  marginBottom: 20,
                  padding: "10px 16px",
                  border: "0.5px solid rgba(13,13,11,0.25)",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  cursor: suggestMut.isPending ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--foreground)",
                  opacity: suggestMut.isPending ? 0.5 : 1,
                }}
              >
                {suggestMut.isPending ? t.import.smartMapPending : t.import.smartMap}
              </button>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {preview.headers.map((header) => (
                <div key={header} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: "var(--text-body-sm)", fontFamily: "var(--font-mono)" }}>{header}</span>
                  <span style={{ opacity: 0.3 }}>&rarr;</span>
                  <select
                    value={mapping[header] ?? ""}
                    onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                    style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                  >
                    <option value="">{t.import.skipColumn}</option>
                    {targetFields.map((f) => (
                      <option key={f} value={f}>{targetLabels[f] ?? f}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview tabel */}
          <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 32 }}>
            <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 16 }}>
              {t.import.step3}
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {preview.headers.map((h) => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, i) => (
                    <tr key={i}>
                      {preview.headers.map((h) => <Td key={h}>{row[h] ?? ""}</Td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import knop */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => importMut.mutate()}
              disabled={importMut.isPending}
              className="label-strong"
              style={{
                padding: "14px 32px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
                opacity: importMut.isPending ? 0.5 : 1,
              }}
            >
              {importMut.isPending ? t.import.importing : t.import.importRows.replace("{count}", String(preview.totalRows))}
            </button>
            <button
              onClick={() => { setPreview(null); setCsvText(""); }}
              className="label-strong"
              style={{
                padding: "14px 24px",
                border: "0.5px solid rgba(13,13,11,0.25)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {t.import.back}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
