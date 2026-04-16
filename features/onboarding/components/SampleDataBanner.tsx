"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearSampleData,
  hasSampleData,
} from "@/features/onboarding/sample-data";

/**
 * Kleine banner bovenaan het dashboard die alleen verschijnt wanneer
 * de gebruiker nog voorbeelddata heeft. Eén klik = alles weg.
 */
export function SampleDataBanner() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["has-sample-data"],
    queryFn: async () => {
      const res = await hasSampleData();
      return res.data?.exists ?? false;
    },
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;

  const onClear = () => {
    setError(null);
    startTransition(async () => {
      const res = await clearSampleData();
      if (res.error) {
        setError(res.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["has-sample-data"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 20px",
        border: "0.5px solid rgba(13,13,11,0.08)",
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7 }}>
        <strong style={{ fontWeight: 600, opacity: 1 }}>Voorbeelddata</strong>
        &nbsp;&mdash; dit zijn fictieve facturen, klanten en bonnen om te
        verkennen. Verwijder ze zodra je eigen administratie begint.
        {error ? (
          <span style={{ display: "block", color: "#b91c1c", marginTop: 4 }}>
            {error}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={pending}
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "8px 14px",
          border: "0.5px solid rgba(13,13,11,0.2)",
          background: "transparent",
          cursor: pending ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {pending ? "Bezig…" : "Verwijder voorbeelden"}
      </button>
    </div>
  );
}
