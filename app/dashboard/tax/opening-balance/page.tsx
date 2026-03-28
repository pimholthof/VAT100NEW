"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOpeningBalance, saveOpeningBalance } from "@/features/tax/opening-balance-actions";
import type { OpeningBalanceInput } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "0.5px solid rgba(13,13,11,0.2)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-body)",
  fontFamily: "var(--font-mono)",
  background: "transparent",
  textAlign: "right",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: "var(--text-body-sm)",
  opacity: 0.5,
  fontWeight: 500,
};

const VELDEN: { key: keyof OpeningBalanceInput; label: string; groep: "activa" | "passiva" }[] = [
  { key: "bank_saldo", label: "Banksaldo", groep: "activa" },
  { key: "debiteuren", label: "Debiteuren", groep: "activa" },
  { key: "vaste_activa", label: "Vaste activa", groep: "activa" },
  { key: "overige_activa", label: "Overige activa", groep: "activa" },
  { key: "crediteuren", label: "Crediteuren", groep: "passiva" },
  { key: "btw_schuld", label: "BTW-schuld", groep: "passiva" },
  { key: "overige_passiva", label: "Overige passiva", groep: "passiva" },
  { key: "eigen_vermogen", label: "Eigen vermogen", groep: "passiva" },
];

function emptyBalance(): OpeningBalanceInput {
  return {
    eigen_vermogen: 0,
    vaste_activa: 0,
    bank_saldo: 0,
    debiteuren: 0,
    crediteuren: 0,
    btw_schuld: 0,
    overige_activa: 0,
    overige_passiva: 0,
  };
}

export default function OpeningBalancePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [form, setForm] = useState<OpeningBalanceInput>(emptyBalance());
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ["opening-balance", year],
    queryFn: async () => {
      const res = await getOpeningBalance(year);
      if (res.data) {
        setForm({
          eigen_vermogen: Number(res.data.eigen_vermogen) || 0,
          vaste_activa: Number(res.data.vaste_activa) || 0,
          bank_saldo: Number(res.data.bank_saldo) || 0,
          debiteuren: Number(res.data.debiteuren) || 0,
          crediteuren: Number(res.data.crediteuren) || 0,
          btw_schuld: Number(res.data.btw_schuld) || 0,
          overige_activa: Number(res.data.overige_activa) || 0,
          overige_passiva: Number(res.data.overige_passiva) || 0,
        });
      } else {
        setForm(emptyBalance());
      }
      return res;
    },
  });

  const saveMut = useMutation({
    mutationFn: () => saveOpeningBalance(year, form),
    onSuccess: (res) => {
      if (res.error) { setError(res.error); return; }
      setError(null);
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["opening-balance", year] });
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  function handleCSVImport() {
    try {
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) { setError("CSV moet minimaal een header en een datarij bevatten."); return; }

      const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
      const values = lines[1].split(/[,;]/).map((v) => v.trim());

      const newForm = { ...emptyBalance() };
      const fieldMap: Record<string, keyof OpeningBalanceInput> = {
        "eigen vermogen": "eigen_vermogen",
        eigen_vermogen: "eigen_vermogen",
        "vaste activa": "vaste_activa",
        vaste_activa: "vaste_activa",
        banksaldo: "bank_saldo",
        bank_saldo: "bank_saldo",
        "bank saldo": "bank_saldo",
        debiteuren: "debiteuren",
        crediteuren: "crediteuren",
        "btw schuld": "btw_schuld",
        btw_schuld: "btw_schuld",
        "btw-schuld": "btw_schuld",
        "overige activa": "overige_activa",
        overige_activa: "overige_activa",
        "overige passiva": "overige_passiva",
        overige_passiva: "overige_passiva",
      };

      headers.forEach((h, i) => {
        const key = fieldMap[h];
        if (key && values[i]) {
          const num = parseFloat(values[i].replace(/[€\s]/g, "").replace(/\./g, "").replace(",", "."));
          if (!isNaN(num)) newForm[key] = num;
        }
      });

      setForm(newForm);
      setCsvText("");
      setError(null);
    } catch {
      setError("Kon CSV niet verwerken.");
    }
  }

  const totaalActiva = form.bank_saldo + form.debiteuren + form.vaste_activa + form.overige_activa;
  const totaalPassiva = form.crediteuren + form.btw_schuld + form.overige_passiva + form.eigen_vermogen;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <Link href="/dashboard/tax" style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, textDecoration: "none", color: "inherit" }}>
            &larr; Terug naar Belasting
          </Link>
          <h1 className="display-title" style={{ marginTop: 8 }}>Openingsbalans</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Importeer de eindbalans van het voorgaande boekjaar
          </p>
        </div>
      </div>

      {/* Jaar selector */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontWeight: 500 }}>Jaar:</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: "8px 14px", border: "0.5px solid rgba(13,13,11,0.2)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-body)", background: "transparent" }}
        >
          {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* CSV Import */}
      <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)", marginBottom: 32 }}>
        <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 12 }}>Importeer via CSV</h3>
        <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.5, marginBottom: 12 }}>
          Plak hier een CSV met kolommen zoals: eigen_vermogen, vaste_activa, bank_saldo, debiteuren, crediteuren, btw_schuld
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={"eigen_vermogen;vaste_activa;bank_saldo;debiteuren\n15000;5000;8000;2000"}
          style={{ ...inputStyle, textAlign: "left", height: 80, fontFamily: "var(--font-mono)", fontSize: 13 }}
        />
        <button
          onClick={handleCSVImport}
          disabled={!csvText.trim()}
          className="label-strong"
          style={{
            marginTop: 8,
            padding: "10px 20px",
            border: "0.5px solid rgba(13,13,11,0.25)",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            cursor: csvText.trim() ? "pointer" : "default",
            opacity: csvText.trim() ? 1 : 0.3,
          }}
        >
          IMPORTEER
        </button>
      </div>

      {error && <p style={{ color: "#A51C30", marginBottom: 16 }}>{error}</p>}
      {success && <p style={{ color: "#2E7D32", marginBottom: 16 }}>Openingsbalans opgeslagen!</p>}

      {/* Formulier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
        {/* Activa */}
        <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)" }}>
          <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 16 }}>Activa</h3>
          {VELDEN.filter((v) => v.groep === "activa").map((v) => (
            <div key={v.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{v.label}</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form[v.key] || ""}
                onChange={(e) => setForm({ ...form, [v.key]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(13,13,11,0.1)", paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600 }}>Totaal activa</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(totaalActiva)}</span>
          </div>
        </div>

        {/* Passiva */}
        <div className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)" }}>
          <h3 style={{ fontSize: "var(--text-body)", fontWeight: 600, marginBottom: 16 }}>Passiva</h3>
          {VELDEN.filter((v) => v.groep === "passiva").map((v) => (
            <div key={v.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{v.label}</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form[v.key] || ""}
                onChange={(e) => setForm({ ...form, [v.key]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(13,13,11,0.1)", paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600 }}>Totaal passiva</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(totaalPassiva)}</span>
          </div>
        </div>
      </div>

      {/* Balans check */}
      {Math.abs(totaalActiva - totaalPassiva) > 0.01 && (
        <p style={{ color: "#A51C30", marginBottom: 16, fontSize: "var(--text-body-sm)" }}>
          Let op: activa ({formatCurrency(totaalActiva)}) en passiva ({formatCurrency(totaalPassiva)}) zijn niet in balans.
        </p>
      )}

      {/* Opslaan */}
      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="label-strong"
        style={{
          padding: "14px 32px",
          border: "none",
          borderRadius: "var(--radius-sm)",
          background: "var(--foreground)",
          color: "var(--background)",
          cursor: "pointer",
          opacity: saveMut.isPending ? 0.5 : 1,
        }}
      >
        {saveMut.isPending ? "OPSLAAN..." : "OPSLAAN"}
      </button>
    </div>
  );
}
