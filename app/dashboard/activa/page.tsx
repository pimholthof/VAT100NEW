"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAssets, createAsset, updateAsset, deleteAsset } from "@/lib/actions/assets";
import type { AssetWithDepreciation, AssetCategory } from "@/lib/types";
import { AssetForm } from "@/components/activa/AssetForm";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  computer: "Computer & ICT",
  meubilair: "Meubilair",
  gereedschap: "Gereedschap",
  vervoer: "Vervoermiddel",
  software: "Software",
  overig: "Overig",
};

export default function ActivaPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithDepreciation | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => getAssets(),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => createAsset(data),
    onSuccess: (res) => {
      if (!res.error) {
        queryClient.invalidateQueries({ queryKey: ["assets"] });
        setShowForm(false);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateAsset(id, data),
    onSuccess: (res) => {
      if (!res.error) {
        queryClient.invalidateQueries({ queryKey: ["assets"] });
        setEditingAsset(null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const assets = result?.data ?? [];

  const totalAcquisition = assets.reduce((s, a) => s + a.acquisition_cost, 0);
  const totalBookValue = assets.reduce((s, a) => s + a.book_value, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="display-title">Activa</h1>
            <p className="page-header-count">
              {assets.length} {assets.length === 1 ? "activum" : "activa"}
            </p>
          </div>
          {!showForm && !editingAsset && (
            <button
              className="action-button-secondary"
              onClick={() => setShowForm(true)}
            >
              + Nieuw activum
            </button>
          )}
        </div>
      </div>

      {/* Totals */}
      {assets.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: "rgba(13,13,11,0.08)",
            border: "0.5px solid rgba(13,13,11,0.08)",
            marginBottom: 32,
          }}
        >
          <div style={{ background: "var(--background)", padding: 20 }}>
            <p className="label" style={{ margin: "0 0 4px", opacity: 0.5 }}>
              Totale aanschafwaarde
            </p>
            <p className="mono-amount" style={{ fontSize: "var(--text-display-sm)", fontWeight: 700, margin: 0 }}>
              {formatCurrency(totalAcquisition)}
            </p>
          </div>
          <div style={{ background: "var(--background)", padding: 20 }}>
            <p className="label" style={{ margin: "0 0 4px", opacity: 0.5 }}>
              Totale boekwaarde
            </p>
            <p className="mono-amount" style={{ fontSize: "var(--text-display-sm)", fontWeight: 700, margin: 0 }}>
              {formatCurrency(totalBookValue)}
            </p>
          </div>
        </div>
      )}

      {/* New asset form */}
      {showForm && (
        <AssetForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Edit asset form */}
      {editingAsset && (
        <AssetForm
          asset={editingAsset}
          onSubmit={(data) =>
            updateMutation.mutate({ id: editingAsset.id, data })
          }
          onCancel={() => setEditingAsset(null)}
          isPending={updateMutation.isPending}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <SkeletonTable
          columns="2fr 1fr 1fr 1fr 1fr 1fr 80px"
          headerWidths={[80, 60, 70, 70, 60, 50, 40]}
          bodyWidths={[70, 50, 60, 60, 50, 40, 30]}
        />
      ) : assets.length === 0 ? (
        <div>
          <p className="empty-state">Nog geen activa</p>
          {!showForm && (
            <button
              className="table-action"
              style={{ opacity: 0.4 }}
              onClick={() => setShowForm(true)}
            >
              Voeg je eerste activum toe
            </button>
          )}
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Omschrijving</Th>
              <Th>Categorie</Th>
              <Th>Aankoopdatum</Th>
              <Th style={{ textAlign: "right" }}>Aanschafwaarde</Th>
              <Th style={{ textAlign: "right" }}>Boekwaarde</Th>
              <Th style={{ textAlign: "right" }}>Afschr./mnd</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset: AssetWithDepreciation) => (
              <tr key={asset.id} style={{ borderBottom: "var(--border-rule)" }}>
                <Td style={{ fontWeight: 400 }}>{asset.description}</Td>
                <Td>{CATEGORY_LABELS[asset.category]}</Td>
                <Td>
                  <span className="mono-amount">{formatDate(asset.acquisition_date)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(asset.acquisition_cost)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(asset.book_value)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(asset.monthly_depreciation)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setEditingAsset(asset)}
                      className="table-action"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je dit activum wilt verwijderen?")) {
                          deleteMutation.mutate(asset.id);
                        }
                      }}
                      className="table-action"
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3, padding: 0 }}
                    >
                      Verwijder
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
