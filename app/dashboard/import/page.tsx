"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  previewImportCSV,
  previewImportClients,
  previewImportBankCSV,
  importInvoices,
  importReceipts,
  importClients,
  importBankTransactions,
  detectClientDuplicates,
} from "@/features/import/actions";
import type { ImportPreview, DuplicateMatch } from "@/features/import/actions";
import { Th, Td } from "@/components/ui";

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

type ImportType = "invoices" | "receipts" | "clients" | "bank";

const MATCH_FIELD_LABELS: Record<string, string> = {
  name: "Naam",
  kvk_number: "KVK-nummer",
  btw_number: "BTW-nummer",
};

export default function ImportPage() {
  const [tab, setTab] = useState<ImportType>("invoices");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; updated?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Client-specific state
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "merge" | "create">("skip");

  const previewMut = useMutation({
    mutationFn: (text: string) => {
      if (tab === "clients") return previewImportClients(text);
      if (tab === "bank") return previewImportBankCSV(text);
      return previewImportCSV(text, tab);
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setPreview(res.data!);
      setMapping(res.data!.mapping);
      setError(null);
      setResult(null);
      setDuplicates([]);
      setShowDuplicates(false);
    },
  });

  const duplicateMut = useMutation({
    mutationFn: () => detectClientDuplicates(csvText, mapping),
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setDuplicates(res.data!.duplicates);
      setShowDuplicates(true);
      setError(null);
    },
  });

  const importMut = useMutation({
    mutationFn: () => {
      if (tab === "clients") return importClients(csvText, mapping, duplicateStrategy);
      if (tab === "bank") return importBankTransactions(csvText, mapping);
      if (tab === "invoices") return importInvoices(csvText, mapping);
      return importReceipts(csvText, mapping);
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setResult(res.data!);
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
    setDuplicates([]);
    setShowDuplicates(false);
  }

  function handleClientImportNext() {
    if (tab === "clients") {
      duplicateMut.mutate();
    } else {
      importMut.mutate();
    }
  }

  const targetFields = tab === "invoices"
    ? ["invoice_number", "client_name", "issue_date", "due_date", "subtotal_ex_vat", "vat_amount", "total_inc_vat", "description", "status"]
    : tab === "receipts"
    ? ["vendor_name", "receipt_date", "amount_ex_vat", "vat_amount", "amount_inc_vat", "category"]
    : tab === "bank"
    ? ["booking_date", "amount", "description", "counterpart_name", "counterpart_iban", "currency", "direction"]
    : ["name", "contact_name", "email", "address", "city", "postal_code", "kvk_number", "btw_number"];

  const targetLabels: Record<string, string> = {
    invoice_number: "Factuurnummer",
    client_name: "Klantnaam",
    issue_date: "Factuurdatum",
    due_date: "Vervaldatum",
    subtotal_ex_vat: "Bedrag excl. BTW",
    vat_amount: "BTW bedrag",
    total_inc_vat: "Bedrag incl. BTW",
    description: "Omschrijving",
    status: "Status",
    vendor_name: "Leverancier",
    receipt_date: "Bondatum",
    amount_ex_vat: "Bedrag excl. BTW",
    amount_inc_vat: "Bedrag incl. BTW",
    category: "Categorie",
    name: "Bedrijfsnaam",
    contact_name: "Contactpersoon",
    email: "E-mail",
    address: "Adres",
    city: "Stad",
    postal_code: "Postcode",
    kvk_number: "KVK-nummer",
    btw_number: "BTW-nummer",
    booking_date: "Datum",
    amount: "Bedrag",
    counterpart_name: "Tegenpartij",
    counterpart_iban: "Tegenrekening IBAN",
    currency: "Valuta",
    direction: "Af/Bij",
  };

  const resultLabel = tab === "invoices" ? "facturen" : tab === "receipts" ? "bonnen" : tab === "bank" ? "transacties" : "klanten";

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="display-title">Importeren</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Importeer voorgaande boekhouding via CSV
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "40px", borderBottom: "0.5px solid rgba(13,13,11,0.12)" }}>
        <button onClick={() => handleTabChange("invoices")} style={tabStyle(tab === "invoices")}>Facturen</button>
        <button onClick={() => handleTabChange("receipts")} style={tabStyle(tab === "receipts")}>Bonnen / Uitgaven</button>
        <button onClick={() => handleTabChange("clients")} style={tabStyle(tab === "clients")}>Klanten</button>
        <button onClick={() => handleTabChange("bank")} style={tabStyle(tab === "bank")}>Banktransacties</button>
      </div>

      {/* Success */}
      {result && (
        <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 32, border: "1px solid #2E7D32" }}>
          <p style={{ fontWeight: 600, color: "#2E7D32" }}>
            Import voltooid: {result.imported} {resultLabel} geïmporteerd
            {(result.updated ?? 0) > 0 && `, ${result.updated} bijgewerkt`}
            {result.skipped > 0 && `, ${result.skipped} overgeslagen`}
          </p>
          {tab === "bank" && result.imported > 0 && (
            <a
              href="/dashboard/bank"
              style={{ display: "inline-block", marginTop: 12, fontSize: "var(--text-body-sm)", color: "var(--foreground)", textDecoration: "underline" }}
            >
              Bekijk transacties &rarr;
            </a>
          )}
        </div>
      )}

      {error && <p style={{ color: "#A51C30", marginBottom: 16 }}>{error}</p>}

      {/* Stap 1: Upload */}
      {!preview && !result && (
        <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)" }}>
          <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 8 }}>
            Stap 1: Upload CSV
          </h3>
          <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
            {tab === "clients"
              ? "Importeer klanten vanuit Moneybird, e-Boekhouden, Excel of andere bronnen. Zorg dat de eerste rij kolomnamen bevat."
              : tab === "bank"
              ? "Importeer bankafschriften van ING, ABN AMRO, Rabobank of andere banken. Download je afschriften als CSV en upload ze hier."
              : "Ondersteunt exports van Moneybird, e-Boekhouden, Excel en andere boekhoudprogramma\u0027s. Zorg dat de eerste rij kolomnamen bevat."}
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
                KIES BESTAND
              </button>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 8 }}>Of plak CSV hier:</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Plak hier je CSV data..."
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
              {previewMut.isPending ? "VERWERKEN..." : "VOLGENDE"}
            </button>
          </div>
        </div>
      )}

      {/* Stap 2: Mapping + Preview */}
      {preview && !result && !showDuplicates && (
        <>
          <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)", marginBottom: 32 }}>
            <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 8 }}>
              Stap 2: Controleer kolom-mapping
            </h3>
            <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
              {preview.totalRows} rijen gevonden. Pas de mapping aan indien nodig.
            </p>

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
                    <option value="">— Overslaan —</option>
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
              Stap 3: Preview (eerste 5 rijen)
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

          {/* Import / Check duplicates knop */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleClientImportNext}
              disabled={importMut.isPending || duplicateMut.isPending}
              className="label-strong"
              style={{
                padding: "14px 32px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
                opacity: importMut.isPending || duplicateMut.isPending ? 0.5 : 1,
              }}
            >
              {importMut.isPending
                ? "IMPORTEREN..."
                : duplicateMut.isPending
                ? "CONTROLEREN..."
                : tab === "clients"
                ? `CONTROLEER ${preview.totalRows} KLANTEN`
                : `IMPORTEER ${preview.totalRows} RIJEN`}
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
              TERUG
            </button>
          </div>
        </>
      )}

      {/* Stap 3 (Klanten): Duplicate review */}
      {showDuplicates && !result && (
        <>
          <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)", marginBottom: 32 }}>
            <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 8 }}>
              Stap 3: Duplicaten controleren
            </h3>

            {duplicates.length === 0 ? (
              <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5 }}>
                Geen duplicaten gevonden. Alle {preview?.totalRows} klanten zijn nieuw.
              </p>
            ) : (
              <>
                <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
                  {duplicates.length} mogelijke duplica{duplicates.length === 1 ? "at" : "ten"} gevonden.
                  Kies wat er met bestaande klanten moet gebeuren.
                </p>

                {/* Strategy selector */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  {([
                    { value: "skip" as const, label: "Overslaan", desc: "Bestaande klanten niet wijzigen" },
                    { value: "merge" as const, label: "Samenvoegen", desc: "Bestaande klanten bijwerken met CSV-data" },
                    { value: "create" as const, label: "Nieuw aanmaken", desc: "Altijd nieuwe klant aanmaken" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDuplicateStrategy(opt.value)}
                      style={{
                        flex: 1,
                        padding: "16px",
                        border: duplicateStrategy === opt.value
                          ? "1.5px solid var(--foreground)"
                          : "0.5px solid rgba(13,13,11,0.15)",
                        borderRadius: "var(--radius-sm)",
                        background: duplicateStrategy === opt.value ? "rgba(0,0,0,0.03)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ display: "block", fontWeight: 600, fontSize: "var(--text-body-sm)", marginBottom: 4 }}>
                        {opt.label}
                      </span>
                      <span style={{ display: "block", fontSize: 12, opacity: 0.5 }}>
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Duplicate list */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <Th>CSV klant</Th>
                        <Th>Bestaande klant</Th>
                        <Th>Match op</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicates.map((dup, i) => (
                        <tr key={i}>
                          <Td>
                            <span style={{ fontWeight: 500 }}>
                              {Object.values(dup.csvRow).filter(Boolean).slice(0, 3).join(" · ")}
                            </span>
                          </Td>
                          <Td>
                            {dup.existingClient.name}
                            {dup.existingClient.email && (
                              <span style={{ opacity: 0.5 }}> · {dup.existingClient.email}</span>
                            )}
                          </Td>
                          <Td>{MATCH_FIELD_LABELS[dup.matchField] ?? dup.matchField}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
              {importMut.isPending ? "IMPORTEREN..." : `IMPORTEER ${preview?.totalRows ?? 0} KLANTEN`}
            </button>
            <button
              onClick={() => { setShowDuplicates(false); }}
              className="label-strong"
              style={{
                padding: "14px 24px",
                border: "0.5px solid rgba(13,13,11,0.25)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              TERUG
            </button>
          </div>
        </>
      )}
    </div>
  );
}
