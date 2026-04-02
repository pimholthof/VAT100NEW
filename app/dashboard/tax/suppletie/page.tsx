"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getVatReturns } from "@/features/tax/vat-returns-actions";
import { createSuppletie } from "@/features/tax/suppletie-actions";
import type { VatReturn } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui";

const RUBRIEKEN = [
  { key: "1a", label: "1a — Leveringen/diensten 21%" },
  { key: "1b", label: "1b — Leveringen/diensten 9%" },
  { key: "1c", label: "1c — Leveringen/diensten overige tarieven" },
  { key: "2a", label: "2a — Intracommunautaire leveringen (ICP)" },
  { key: "3b", label: "3b — Verleggingsregelingen EU" },
  { key: "4a", label: "4a — Leveringen buiten EU" },
  { key: "4b", label: "4b — Diensten buiten EU" },
] as const;

export default function SuppletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const returnId = searchParams.get("returnId") ?? "";

  const { data: returnsResult } = useQuery({
    queryKey: ["vat-returns"],
    queryFn: () => getVatReturns(),
  });

  const original = (returnsResult?.data ?? []).find(
    (r: VatReturn) => r.id === returnId
  );

  const [reden, setReden] = useState("");
  const [values, setValues] = useState<Record<string, { omzet: number; btw: number }>>(() => {
    if (!original) return {};
    const init: Record<string, { omzet: number; btw: number }> = {};
    for (const r of RUBRIEKEN) {
      const omzetKey = `rubriek_${r.key}_omzet` as keyof VatReturn;
      const btwKey = `rubriek_${r.key}_btw` as keyof VatReturn;
      init[r.key] = {
        omzet: Number(original?.[omzetKey] ?? 0),
        btw: Number(original?.[btwKey] ?? 0),
      };
    }
    return init;
  });
  const [voorbelasting, setVoorbelasting] = useState(
    Number(original?.rubriek_5b ?? 0)
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const v = values;
      return createSuppletie(returnId, reden, {
        rubriek_1a_omzet: v["1a"]?.omzet ?? 0,
        rubriek_1a_btw: v["1a"]?.btw ?? 0,
        rubriek_1b_omzet: v["1b"]?.omzet ?? 0,
        rubriek_1b_btw: v["1b"]?.btw ?? 0,
        rubriek_1c_omzet: v["1c"]?.omzet ?? 0,
        rubriek_1c_btw: v["1c"]?.btw ?? 0,
        rubriek_2a_omzet: v["2a"]?.omzet ?? 0,
        rubriek_2a_btw: v["2a"]?.btw ?? 0,
        rubriek_3b_omzet: v["3b"]?.omzet ?? 0,
        rubriek_3b_btw: v["3b"]?.btw ?? 0,
        rubriek_4a_omzet: v["4a"]?.omzet ?? 0,
        rubriek_4a_btw: v["4a"]?.btw ?? 0,
        rubriek_4b_omzet: v["4b"]?.omzet ?? 0,
        rubriek_4b_btw: v["4b"]?.btw ?? 0,
        rubriek_5b: voorbelasting,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast(result.error);
        return;
      }
      toast("Suppletie aangemaakt");
      router.push("/dashboard/tax");
    },
  });

  if (!original) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ opacity: 0.4 }}>
          Selecteer eerst een ingediende BTW-aangifte om een suppletie te maken.
        </p>
        <a href="/dashboard/tax" className="btn-secondary" style={{ marginTop: 16, display: "inline-block" }}>
          Terug naar belasting
        </a>
      </div>
    );
  }

  const updateRubriek = (key: string, field: "omzet" | "btw", value: number) => {
    setValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            BTW Suppletie
          </h1>
          <p className="label" style={{ opacity: 0.25 }}>
            CORRECTIE OP Q{original.quarter} {original.year}
          </p>
        </div>
        <a href="/dashboard/tax" className="btn-secondary">
          Annuleren
        </a>
      </div>

      {/* Reden */}
      <div className="glass" style={{ padding: 32, borderRadius: 16, marginBottom: 24 }}>
        <label className="label" style={{ display: "block", marginBottom: 8, opacity: 0.5 }}>
          REDEN VOOR SUPPLETIE
        </label>
        <textarea
          value={reden}
          onChange={(e) => setReden(e.target.value)}
          className="input"
          rows={3}
          style={{ width: "100%", resize: "vertical" }}
          placeholder="Beschrijf waarom een correctie nodig is..."
        />
      </div>

      {/* Rubrieken */}
      <div className="glass" style={{ padding: 32, borderRadius: 16, marginBottom: 24 }}>
        <h3 className="label" style={{ marginBottom: 16, opacity: 0.5 }}>
          GECORRIGEERDE RUBRIEKEN
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "8px 16px", marginBottom: 16, fontSize: 11, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <span>Rubriek</span>
          <span style={{ textAlign: "right" }}>Origineel</span>
          <span style={{ textAlign: "right" }}>Gecorrigeerd omzet</span>
          <span style={{ textAlign: "right" }}>Gecorrigeerd BTW</span>
        </div>
        {RUBRIEKEN.map((r) => {
          const origOmzet = Number((original as unknown as Record<string, unknown>)[`rubriek_${r.key}_omzet`] ?? 0);
          const origBtw = Number((original as unknown as Record<string, unknown>)[`rubriek_${r.key}_btw`] ?? 0);
          return (
            <div key={r.key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "8px 16px", marginBottom: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>{r.label}</span>
              <span style={{ textAlign: "right", fontSize: 12, opacity: 0.3, fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(origOmzet)} / {formatCurrency(origBtw)}
              </span>
              <input
                type="number"
                value={values[r.key]?.omzet ?? 0}
                onChange={(e) => updateRubriek(r.key, "omzet", Number(e.target.value))}
                className="input"
                step={0.01}
                style={{ textAlign: "right" }}
              />
              <input
                type="number"
                value={values[r.key]?.btw ?? 0}
                onChange={(e) => updateRubriek(r.key, "btw", Number(e.target.value))}
                className="input"
                step={0.01}
                style={{ textAlign: "right" }}
              />
            </div>
          );
        })}

        {/* 5b Voorbelasting */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "8px 16px", marginTop: 16, paddingTop: 16, borderTop: "0.5px solid rgba(0,0,0,0.08)", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>5b — Voorbelasting</span>
          <span style={{ textAlign: "right", fontSize: 12, opacity: 0.3, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(Number(original.rubriek_5b))}
          </span>
          <span />
          <input
            type="number"
            value={voorbelasting}
            onChange={(e) => setVoorbelasting(Number(e.target.value))}
            className="input"
            step={0.01}
            style={{ textAlign: "right" }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <a href="/dashboard/tax" className="btn-secondary">
          Annuleren
        </a>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !reden.trim()}
          className="btn-primary"
        >
          {saveMutation.isPending ? "Opslaan..." : "Suppletie aanmaken"}
        </button>
      </div>
    </div>
  );
}
