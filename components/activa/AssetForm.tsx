"use client";

import { useState } from "react";
import type { AssetWithDepreciation, AssetCategory } from "@/lib/types";

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: "computer", label: "Computer & ICT" },
  { value: "meubilair", label: "Meubilair" },
  { value: "gereedschap", label: "Gereedschap" },
  { value: "vervoer", label: "Vervoermiddel" },
  { value: "software", label: "Software" },
  { value: "overig", label: "Overig" },
];

interface Props {
  asset?: AssetWithDepreciation;
  onSubmit: (data: {
    description: string;
    acquisition_date: string;
    acquisition_cost: number;
    residual_value: number;
    useful_life_months: number;
    category: AssetCategory;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function AssetForm({ asset, onSubmit, onCancel, isPending }: Props) {
  const [description, setDescription] = useState(asset?.description ?? "");
  const [acquisitionDate, setAcquisitionDate] = useState(asset?.acquisition_date ?? "");
  const [acquisitionCost, setAcquisitionCost] = useState(asset?.acquisition_cost?.toString() ?? "");
  const [residualValue, setResidualValue] = useState(asset?.residual_value?.toString() ?? "0");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState(asset?.useful_life_months?.toString() ?? "60");
  const [category, setCategory] = useState<AssetCategory>(asset?.category ?? "overig");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      description,
      acquisition_date: acquisitionDate,
      acquisition_cost: parseFloat(acquisitionCost) || 0,
      residual_value: parseFloat(residualValue) || 0,
      useful_life_months: parseInt(usefulLifeMonths) || 60,
      category,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
      <div
        style={{
          border: "0.5px solid rgba(13,13,11,0.15)",
          padding: 24,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>
              Omschrijving
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              required
              placeholder="Bijv. MacBook Pro 16 inch"
            />
          </div>

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>
              Categorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="input-field"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>
              Aankoopdatum
            </label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>
              Aanschafwaarde (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>
              Restwaarde (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={residualValue}
              onChange={(e) => setResidualValue(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="label" style={{ display: "block", marginBottom: 4 }}>
              Levensduur (maanden)
            </label>
            <input
              type="number"
              min="1"
              value={usefulLifeMonths}
              onChange={(e) => setUsefulLifeMonths(e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            className="action-button"
            disabled={isPending}
          >
            {isPending ? "OPSLAAN..." : asset ? "BIJWERKEN" : "TOEVOEGEN"}
          </button>
          <button
            type="button"
            className="action-button-secondary"
            onClick={onCancel}
          >
            ANNULEREN
          </button>
        </div>
      </div>
    </form>
  );
}
