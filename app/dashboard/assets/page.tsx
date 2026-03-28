"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAssets, createAsset, updateAsset, deleteAsset, getActivastaat } from "@/features/assets/actions";
import type { Asset, AssetInput } from "@/lib/types";
import { SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORIEEN = [
  "Computer & software",
  "Meubilair",
  "Vervoermiddel",
  "Machines",
  "Gereedschap",
  "Overig",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "0.5px solid rgba(13,13,11,0.2)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-body)",
  fontFamily: "inherit",
  background: "transparent",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: "var(--text-body-sm)",
  opacity: 0.5,
  fontWeight: 500,
};

function EmptyForm(): AssetInput {
  return {
    omschrijving: "",
    aanschaf_datum: new Date().toISOString().slice(0, 10),
    aanschaf_prijs: 0,
    restwaarde: 0,
    levensduur: 5,
    categorie: null,
    receipt_id: null,
    notitie: null,
  };
}

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetInput>(EmptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const { data: assetsResult, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => getAssets(),
  });

  const { data: activastaatResult } = useQuery({
    queryKey: ["activastaat", currentYear],
    queryFn: () => getActivastaat(currentYear),
  });

  const assets = assetsResult?.data ?? [];
  const activastaat = activastaatResult?.data;

  const createMut = useMutation({
    mutationFn: (input: AssetInput) => createAsset(input),
    onSuccess: (result) => {
      if (result.error) { setError(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["activastaat"] });
      setShowForm(false);
      setForm(EmptyForm());
      setError(null);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssetInput }) => updateAsset(id, input),
    onSuccess: (result) => {
      if (result.error) { setError(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["activastaat"] });
      setEditingId(null);
      setShowForm(false);
      setForm(EmptyForm());
      setError(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["activastaat"] });
      setDeleteId(null);
    },
  });

  function handleEdit(asset: Asset) {
    setEditingId(asset.id);
    setForm({
      omschrijving: asset.omschrijving,
      aanschaf_datum: asset.aanschaf_datum,
      aanschaf_prijs: Number(asset.aanschaf_prijs),
      restwaarde: Number(asset.restwaarde),
      levensduur: asset.levensduur,
      categorie: asset.categorie,
      receipt_id: asset.receipt_id,
      notitie: asset.notitie,
      is_verkocht: asset.is_verkocht,
      verkoop_datum: asset.verkoop_datum,
      verkoop_prijs: asset.verkoop_prijs ? Number(asset.verkoop_prijs) : null,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (editingId) {
      updateMut.mutate({ id: editingId, input: form });
    } else {
      createMut.mutate(form);
    }
  }

  // Find activastaat row for an asset
  function getDepreciation(assetId: string) {
    return activastaat?.rijen.find((r) => r.id === assetId);
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Activastaat</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Vaste activa en afschrijvingen
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <a
            href="/api/export/activastaat"
            download
            className="label-strong"
            style={{
              padding: "14px 24px",
              border: "0.5px solid rgba(13,13,11,0.25)",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            EXPORTEER CSV
          </a>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EmptyForm()); setError(null); }}
            className="label-strong"
            style={{
              padding: "14px 24px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "var(--foreground)",
              color: "var(--background)",
              cursor: "pointer",
            }}
          >
            + NIEUW ACTIVUM
          </button>
        </div>
      </div>

      {/* Totalen */}
      {activastaat && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginBottom: 48 }}>
          {[
            { label: "Totaal aanschafprijs", value: activastaat.totaalAanschafprijs },
            { label: "Afschrijving dit jaar", value: activastaat.totaalAfschrijvingDitJaar },
            { label: "Cumulatief afgeschreven", value: activastaat.totaalCumulatief },
            { label: "Totaal boekwaarde", value: activastaat.totaalBoekwaarde },
          ].map((stat) => (
            <div key={stat.label} className="glass" style={{ padding: 24, borderRadius: "var(--radius-md)" }}>
              <p className="label" style={{ marginBottom: 8 }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                {formatCurrency(stat.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-md)", marginBottom: 48 }}>
          <h2 style={{ fontSize: "var(--text-body-lg)", fontWeight: 600, marginBottom: 24 }}>
            {editingId ? "Activum bewerken" : "Nieuw activum"}
          </h2>

          {error && <p style={{ color: "#A51C30", marginBottom: 16 }}>{error}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Omschrijving *</label>
              <input style={inputStyle} value={form.omschrijving} onChange={(e) => setForm({ ...form, omschrijving: e.target.value })} placeholder="bijv. MacBook Pro" />
            </div>
            <div>
              <label style={labelStyle}>Aanschafdatum *</label>
              <input style={inputStyle} type="date" value={form.aanschaf_datum} onChange={(e) => setForm({ ...form, aanschaf_datum: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Aanschafprijs (excl. BTW) *</label>
              <input style={inputStyle} type="number" step="0.01" min="0" value={form.aanschaf_prijs || ""} onChange={(e) => setForm({ ...form, aanschaf_prijs: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>Restwaarde</label>
              <input style={inputStyle} type="number" step="0.01" min="0" value={form.restwaarde || ""} onChange={(e) => setForm({ ...form, restwaarde: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>Levensduur (jaren)</label>
              <input style={inputStyle} type="number" min="1" max="30" value={form.levensduur} onChange={(e) => setForm({ ...form, levensduur: parseInt(e.target.value) || 5 })} />
            </div>
            <div>
              <label style={labelStyle}>Categorie</label>
              <select style={inputStyle} value={form.categorie ?? ""} onChange={(e) => setForm({ ...form, categorie: e.target.value || null })}>
                <option value="">Selecteer...</option>
                {CATEGORIEEN.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notitie</label>
              <input style={inputStyle} value={form.notitie ?? ""} onChange={(e) => setForm({ ...form, notitie: e.target.value || null })} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
              className="label-strong"
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
                opacity: (createMut.isPending || updateMut.isPending) ? 0.5 : 1,
              }}
            >
              {editingId ? "OPSLAAN" : "TOEVOEGEN"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
              className="label-strong"
              style={{
                padding: "12px 24px",
                border: "0.5px solid rgba(13,13,11,0.25)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              ANNULEREN
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", opacity: 0.4 }}>
          <p style={{ fontSize: "var(--text-body-lg)" }}>Nog geen activa geregistreerd</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Omschrijving</Th>
                <Th>Categorie</Th>
                <Th style={{ textAlign: "right" }}>Aanschafdatum</Th>
                <Th style={{ textAlign: "right" }}>Aanschafprijs</Th>
                <Th style={{ textAlign: "right" }}>Afschr. / jaar</Th>
                <Th style={{ textAlign: "right" }}>Boekwaarde</Th>
                <Th style={{ textAlign: "right" }}>Rest. jaren</Th>
                <Th style={{ textAlign: "right" }}></Th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const dep = getDepreciation(asset.id);
                return (
                  <tr key={asset.id}>
                    <Td>
                      <span style={{ fontWeight: 500 }}>{asset.omschrijving}</span>
                      {asset.is_verkocht && (
                        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.5, fontStyle: "italic" }}>verkocht</span>
                      )}
                    </Td>
                    <Td>{asset.categorie ?? "—"}</Td>
                    <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatDate(asset.aanschaf_datum)}</span></Td>
                    <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(Number(asset.aanschaf_prijs))}</span></Td>
                    <Td style={{ textAlign: "right" }}><span className="mono-amount">{dep ? formatCurrency(dep.jaarAfschrijving) : "—"}</span></Td>
                    <Td style={{ textAlign: "right" }}><span className="mono-amount">{dep ? formatCurrency(dep.boekwaarde) : "—"}</span></Td>
                    <Td style={{ textAlign: "right" }}><span className="mono-amount">{dep ? dep.resterendeJaren : "—"}</span></Td>
                    <Td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleEdit(asset)}
                          style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: 13 }}
                        >
                          Bewerk
                        </button>
                        <button
                          onClick={() => setDeleteId(asset.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: 13, color: "#A51C30" }}
                        >
                          Verwijder
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete bevestiging */}
      <ConfirmDialog
        open={!!deleteId}
        title="Activum verwijderen"
        message="Weet je zeker dat je dit activum wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
