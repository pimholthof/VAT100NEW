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

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-foreground/8 border border-foreground/8 mb-8">
          <div className="bg-[var(--background)] p-5">
            <p className="label mb-1 opacity-50">
              Totale aanschafwaarde
            </p>
            <p className="mono-amount text-[length:var(--text-h2)] font-bold m-0">
              {formatCurrency(totalAcquisition)}
            </p>
          </div>
          <div className="bg-[var(--background)] p-5">
            <p className="label mb-1 opacity-50">
              Totale boekwaarde
            </p>
            <p className="mono-amount text-[length:var(--text-h2)] font-bold m-0">
              {formatCurrency(totalBookValue)}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <AssetForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          isPending={createMutation.isPending}
        />
      )}

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

      {isLoading ? (
        <SkeletonTable
          columns="2fr 1fr 1fr 1fr 1fr 1fr 80px"
          headerWidths={[80, 60, 70, 70, 60, 50, 40]}
          bodyWidths={[70, 50, 60, 60, 50, 40, 30]}
        />
      ) : assets.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--color-muted)] text-[15px] mb-4">
            Nog geen activa — registreer je eerste bedrijfsmiddel
          </p>
          {!showForm && (
            <button
              className="inline-block font-sans text-[length:var(--text-label)] font-semibold uppercase tracking-[0.10em] px-7 py-3.5 border-[0.5px] border-foreground/25 bg-transparent text-foreground cursor-pointer transition-opacity duration-200 hover:opacity-70"
              onClick={() => setShowForm(true)}
            >
              + Eerste activum registreren
            </button>
          )}
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/15 text-left">
              <Th>Omschrijving</Th>
              <Th>Categorie</Th>
              <Th>Aankoopdatum</Th>
              <Th className="text-right">Aanschafwaarde</Th>
              <Th className="text-right">Boekwaarde</Th>
              <Th className="text-right">Afschr./mnd</Th>
              <Th className="text-right">Acties</Th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset: AssetWithDepreciation) => (
              <tr key={asset.id} className="border-b border-[var(--border-rule)]">
                <Td className="font-normal">{asset.description}</Td>
                <Td>{CATEGORY_LABELS[asset.category]}</Td>
                <Td>
                  <span className="mono-amount">{formatDate(asset.acquisition_date)}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(asset.acquisition_cost)}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(asset.book_value)}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(asset.monthly_depreciation)}</span>
                </Td>
                <Td className="text-right">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setEditingAsset(asset)}
                      className="table-action bg-transparent border-none cursor-pointer p-0"
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Weet je zeker dat je dit activum wilt verwijderen?")) {
                          deleteMutation.mutate(asset.id);
                        }
                      }}
                      className="table-action bg-transparent border-none cursor-pointer opacity-30 p-0"
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
