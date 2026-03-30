"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  previewImportClients,
  previewImportCSV,
  importClients,
  importInvoices,
  importReceipts,
  importHistoricalCostSummary,
} from "@/features/import/actions";
import type { ImportPreview } from "@/features/import/actions";
import { KOSTENSOORTEN } from "@/lib/constants/costs";
import { Th, Td } from "@/components/ui";
import Link from "next/link";

const STEPS = [
  { key: "welcome", label: "Welkom" },
  { key: "clients", label: "Klanten" },
  { key: "open-invoices", label: "Open facturen" },
  { key: "paid-invoices", label: "Betaalde facturen" },
  { key: "costs", label: "Kosten" },
  { key: "done", label: "Klaar" },
] as const;

type StepKey = typeof STEPS[number]["key"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "0.5px solid rgba(13,13,11,0.2)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-body)",
  fontFamily: "inherit",
  background: "transparent",
};

const numberInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 140,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

interface StepResult {
  imported: number;
  skipped?: number;
  updated?: number;
}

export default function ImportWizardPage() {
  const [currentStep, setCurrentStep] = useState<StepKey>("welcome");
  const [results, setResults] = useState<Partial<Record<StepKey, StepResult>>>({});

  // CSV import state (reused across steps)
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Historical costs state
  const [costYear, setCostYear] = useState(new Date().getFullYear() - 1);
  const [costEntries, setCostEntries] = useState<Record<number, { amount: string; vat: string }>>(
    Object.fromEntries(KOSTENSOORTEN.slice(0, 10).map((k) => [k.code, { amount: "", vat: "" }]))
  );

  function resetCsvState() {
    setCsvText("");
    setPreview(null);
    setMapping({});
    setError(null);
  }

  function goToStep(step: StepKey) {
    resetCsvState();
    setCurrentStep(step);
  }

  function nextStep() {
    const idx = STEPS.findIndex((s) => s.key === currentStep);
    if (idx < STEPS.length - 1) goToStep(STEPS[idx + 1].key);
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // CSV preview mutation
  const previewMut = useMutation({
    mutationFn: (text: string) => {
      if (currentStep === "clients") return previewImportClients(text);
      return previewImportCSV(text, currentStep === "costs" ? "receipts" : "invoices");
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setPreview(res.data!);
      setMapping(res.data!.mapping);
      setError(null);
    },
  });

  // CSV import mutation
  const importMut = useMutation({
    mutationFn: () => {
      if (currentStep === "clients") return importClients(csvText, mapping, "skip");
      if (currentStep === "open-invoices") return importInvoices(csvText, mapping);
      if (currentStep === "paid-invoices") return importInvoices(csvText, mapping);
      return importReceipts(csvText, mapping);
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setResults((prev) => ({ ...prev, [currentStep]: res.data! }));
      setError(null);
    },
  });

  // Historical cost summary mutation
  const costMut = useMutation({
    mutationFn: () => {
      const costs = KOSTENSOORTEN
        .filter((k) => {
          const entry = costEntries[k.code];
          return entry && parseFloat(entry.amount) > 0;
        })
        .map((k) => {
          const entry = costEntries[k.code];
          return {
            category: k.label,
            cost_code: k.code,
            amount_ex_vat: parseFloat(entry.amount) || 0,
            vat_amount: parseFloat(entry.vat) || 0,
          };
        });
      return importHistoricalCostSummary(costYear, costs);
    },
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setResults((prev) => ({ ...prev, costs: res.data! }));
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

  // Target fields per step
  const targetFields: Record<string, string[]> = {
    clients: ["name", "contact_name", "email", "address", "city", "postal_code", "kvk_number", "btw_number"],
    "open-invoices": ["invoice_number", "client_name", "issue_date", "due_date", "subtotal_ex_vat", "vat_amount", "total_inc_vat"],
    "paid-invoices": ["invoice_number", "client_name", "issue_date", "subtotal_ex_vat", "vat_amount", "total_inc_vat"],
    costs: ["vendor_name", "receipt_date", "amount_ex_vat", "vat_amount", "amount_inc_vat", "category"],
  };

  const targetLabels: Record<string, string> = {
    name: "Bedrijfsnaam", contact_name: "Contactpersoon", email: "E-mail",
    address: "Adres", city: "Stad", postal_code: "Postcode",
    kvk_number: "KVK-nummer", btw_number: "BTW-nummer",
    invoice_number: "Factuurnummer", client_name: "Klantnaam",
    issue_date: "Factuurdatum", due_date: "Vervaldatum",
    subtotal_ex_vat: "Bedrag excl. BTW", vat_amount: "BTW bedrag",
    total_inc_vat: "Bedrag incl. BTW", description: "Omschrijving",
    vendor_name: "Leverancier", receipt_date: "Bondatum",
    amount_ex_vat: "Bedrag excl. BTW", amount_inc_vat: "Bedrag incl. BTW",
    category: "Categorie",
  };

  const stepResult = results[currentStep];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="display-title">Import Wizard</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Stap-voor-stap je voorgaande boekhouding importeren
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 48 }}>
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            style={{
              flex: 1,
              height: 3,
              background: i <= currentStepIndex ? "var(--foreground)" : "rgba(13,13,11,0.1)",
              borderRadius: 2,
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {error && <p style={{ color: "#A51C30", marginBottom: 16 }}>{error}</p>}

      {/* Step: Welcome */}
      {currentStep === "welcome" && (
        <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "var(--text-body-lg)", fontWeight: 600, marginBottom: 16 }}>
            Welkom bij de import wizard
          </h2>
          <p style={{ fontSize: "var(--text-body)", fontWeight: 300, opacity: 0.7, marginBottom: 8 }}>
            We helpen je je voorgaande boekhouding in te laden in 4 stappen:
          </p>
          <ol style={{ fontSize: "var(--text-body)", fontWeight: 300, opacity: 0.7, paddingLeft: 24, lineHeight: 2 }}>
            <li>Klanten importeren</li>
            <li>Openstaande facturen importeren</li>
            <li>Betaalde facturen importeren</li>
            <li>Historische kosten invoeren</li>
          </ol>
          <p style={{ fontSize: "var(--text-body-sm)", fontWeight: 300, opacity: 0.5, marginTop: 16, marginBottom: 24 }}>
            Je kunt elke stap overslaan als dat niet van toepassing is.
          </p>
          <button onClick={nextStep} className="btn-primary" style={{ border: "none", cursor: "pointer" }}>
            Starten
          </button>
        </div>
      )}

      {/* CSV import steps: clients, open-invoices, paid-invoices */}
      {(currentStep === "clients" || currentStep === "open-invoices" || currentStep === "paid-invoices") && (
        <>
          <h2 style={{ fontSize: "var(--text-body-lg)", fontWeight: 600, marginBottom: 24 }}>
            {currentStep === "clients" ? "Stap 1: Klanten importeren"
              : currentStep === "open-invoices" ? "Stap 2: Openstaande facturen"
              : "Stap 3: Betaalde facturen"}
          </h2>

          {stepResult ? (
            <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 32, border: "1px solid #2E7D32" }}>
              <p style={{ fontWeight: 600, color: "#2E7D32", marginBottom: 16 }}>
                {stepResult.imported} geïmporteerd
                {(stepResult.updated ?? 0) > 0 && `, ${stepResult.updated} bijgewerkt`}
                {(stepResult.skipped ?? 0) > 0 && `, ${stepResult.skipped} overgeslagen`}
              </p>
              <button onClick={nextStep} className="btn-primary" style={{ border: "none", cursor: "pointer" }}>
                Volgende stap
              </button>
            </div>
          ) : !preview ? (
            <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)" }}>
              <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
                Upload een CSV-bestand of plak de data hieronder.
              </p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} className="btn-secondary" style={{ cursor: "pointer", marginBottom: 16 }}>
                KIES BESTAND
              </button>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Plak hier je CSV data..."
                style={{ ...inputStyle, height: 100, fontFamily: "var(--font-mono)", fontSize: 13, display: "block", marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => csvText.trim() && previewMut.mutate(csvText)}
                  disabled={!csvText.trim() || previewMut.isPending}
                  className="btn-primary"
                  style={{ border: "none", cursor: "pointer", opacity: csvText.trim() ? 1 : 0.3 }}
                >
                  {previewMut.isPending ? "Verwerken..." : "Volgende"}
                </button>
                <button onClick={nextStep} className="btn-secondary" style={{ cursor: "pointer" }}>
                  Overslaan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mapping */}
              <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 24 }}>
                <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 12 }}>
                  {preview.totalRows} rijen gevonden. Controleer de kolom-mapping.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {preview.headers.map((header) => (
                    <div key={header} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 13, fontFamily: "var(--font-mono)" }}>{header}</span>
                      <span style={{ opacity: 0.3 }}>&rarr;</span>
                      <select
                        value={mapping[header] ?? ""}
                        onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                        style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                      >
                        <option value="">— Overslaan —</option>
                        {(targetFields[currentStep] ?? []).map((f) => (
                          <option key={f} value={f}>{targetLabels[f] ?? f}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 24, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>{preview.headers.map((h) => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i}>{preview.headers.map((h) => <Td key={h}>{row[h] ?? ""}</Td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => importMut.mutate()}
                  disabled={importMut.isPending}
                  className="btn-primary"
                  style={{ border: "none", cursor: "pointer", opacity: importMut.isPending ? 0.5 : 1 }}
                >
                  {importMut.isPending ? "Importeren..." : `Importeer ${preview.totalRows} rijen`}
                </button>
                <button onClick={() => setPreview(null)} className="btn-secondary" style={{ cursor: "pointer" }}>
                  Terug
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Step: Historical costs (manual entry) */}
      {currentStep === "costs" && (
        <>
          <h2 style={{ fontSize: "var(--text-body-lg)", fontWeight: 600, marginBottom: 24 }}>
            Stap 4: Historische kosten
          </h2>

          {results.costs ? (
            <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 32, border: "1px solid #2E7D32" }}>
              <p style={{ fontWeight: 600, color: "#2E7D32", marginBottom: 16 }}>
                {results.costs.imported} kostencategorieën opgeslagen voor {costYear}
              </p>
              <button onClick={nextStep} className="btn-primary" style={{ border: "none", cursor: "pointer" }}>
                Afronden
              </button>
            </div>
          ) : (
            <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)" }}>
              <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 16 }}>
                Vul de totale kosten per categorie in voor het voorgaande boekjaar. Laat leeg wat niet van toepassing is.
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: "var(--text-body-sm)", fontWeight: 500 }}>Jaar</label>
                <select
                  value={costYear}
                  onChange={(e) => setCostYear(Number(e.target.value))}
                  style={{ ...inputStyle, width: 120, marginLeft: 12 }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-body-sm)" }}>
                <thead>
                  <tr>
                    <Th>Categorie</Th>
                    <Th style={{ textAlign: "right" }}>Bedrag excl. BTW</Th>
                    <Th style={{ textAlign: "right" }}>BTW bedrag</Th>
                  </tr>
                </thead>
                <tbody>
                  {KOSTENSOORTEN.map((k) => (
                    <tr key={k.code} style={{ borderBottom: "var(--border)" }}>
                      <Td>{k.label}</Td>
                      <Td style={{ textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={costEntries[k.code]?.amount ?? ""}
                          onChange={(e) => setCostEntries((prev) => ({
                            ...prev,
                            [k.code]: { ...prev[k.code], amount: e.target.value, vat: prev[k.code]?.vat ?? "" },
                          }))}
                          style={numberInputStyle}
                        />
                      </Td>
                      <Td style={{ textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={costEntries[k.code]?.vat ?? ""}
                          onChange={(e) => setCostEntries((prev) => ({
                            ...prev,
                            [k.code]: { amount: prev[k.code]?.amount ?? "", vat: e.target.value },
                          }))}
                          style={numberInputStyle}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => costMut.mutate()}
                  disabled={costMut.isPending}
                  className="btn-primary"
                  style={{ border: "none", cursor: "pointer", opacity: costMut.isPending ? 0.5 : 1 }}
                >
                  {costMut.isPending ? "Opslaan..." : "Opslaan"}
                </button>
                <button onClick={nextStep} className="btn-secondary" style={{ cursor: "pointer" }}>
                  Overslaan
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step: Done */}
      {currentStep === "done" && (
        <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "var(--text-body-lg)", fontWeight: 600, marginBottom: 16 }}>
            Import voltooid
          </h2>
          <p style={{ fontSize: "var(--text-body)", fontWeight: 300, opacity: 0.7, marginBottom: 24 }}>
            Je voorgaande boekhouding is ingeladen. Hier is een samenvatting:
          </p>

          <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
            {results.clients && <SummaryLine label="Klanten" count={results.clients.imported} />}
            {results["open-invoices"] && <SummaryLine label="Openstaande facturen" count={results["open-invoices"].imported} />}
            {results["paid-invoices"] && <SummaryLine label="Betaalde facturen" count={results["paid-invoices"].imported} />}
            {results.costs && <SummaryLine label="Kostencategorieën" count={results.costs.imported} />}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/dashboard" className="btn-primary" style={{ textDecoration: "none" }}>
              Naar dashboard
            </Link>
            <Link href="/dashboard/tax/opening-balance" className="btn-secondary" style={{ textDecoration: "none" }}>
              Openingsbalans invullen
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryLine({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "var(--border)" }}>
      <span style={{ fontWeight: 300 }}>{label}</span>
      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </div>
  );
}
