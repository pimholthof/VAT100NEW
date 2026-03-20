"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAnnualAccount,
  generateAnnualAccount,
  previewAnnualFigures,
} from "@/lib/actions/annual-account";
import { getUserRole } from "@/lib/actions/advisor";
import type { AnnualAccount } from "@/lib/annual-account/types";
import { FiguresPreview } from "./FiguresPreview";
import { DownloadButtons } from "./DownloadButtons";

interface Props {
  fiscalYear: number;
  initialAccount: AnnualAccount | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "CONCEPT",
  reviewed: "BEOORDEELD",
  final: "DEFINITIEF",
};

export function AnnualAccountDetail({ fiscalYear, initialAccount }: Props) {
  const queryClient = useQueryClient();
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { data: roleResult } = useQuery({
    queryKey: ["user-role"],
    queryFn: () => getUserRole(),
  });

  const isAdvisor = roleResult?.data === "advisor";

  const { data: accountResult } = useQuery({
    queryKey: ["annual-account", fiscalYear],
    queryFn: () => getAnnualAccount(fiscalYear),
    initialData: initialAccount ? { error: null, data: initialAccount } : undefined,
    staleTime: 60_000,
  });

  const account = accountResult?.data;

  const generateMutation = useMutation({
    mutationFn: () => generateAnnualAccount(fiscalYear),
    onSuccess: (result) => {
      if (result.error) {
        setGenerateError(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["annual-account", fiscalYear] });
      queryClient.invalidateQueries({ queryKey: ["annual-accounts"] });
    },
    onError: () => {
      setGenerateError("Er ging iets mis bij het genereren.");
    },
  });

  const previewQuery = useQuery({
    queryKey: ["annual-figures-preview", fiscalYear],
    queryFn: () => previewAnnualFigures(fiscalYear),
    enabled: !account,
    staleTime: 30_000,
  });

  const figures = account?.figures ?? previewQuery.data?.data ?? null;
  const isGenerating = generateMutation.isPending;

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontSize: "var(--text-h2)",
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            margin: 0,
          }}
        >
          Jaarrekening {fiscalYear}
        </h1>
        {account && (
          <span
            className="label"
            style={{
              margin: 0,
              color:
                account.status === "final"
                  ? "var(--vat-olive)"
                  : account.status === "reviewed"
                    ? "var(--color-warning)"
                    : "var(--vat-mid-grey)",
            }}
          >
            <span
              className="status-dot"
              data-status={account.status === "final" ? "active" : "pending"}
            />
            {STATUS_LABELS[account.status] ?? account.status}
          </span>
        )}
      </div>

      {/* Figures preview */}
      {figures && <FiguresPreview figures={figures} />}

      {/* Empty state: no account yet */}
      {!account && !previewQuery.isLoading && (
        <div style={{ padding: "32px 0" }}>
          {!figures && (
            <p className="empty-state" style={{ marginBottom: 24 }}>
              Nog geen jaarrekening voor {fiscalYear}
            </p>
          )}
          {isAdvisor ? (
            <button
              className="action-button"
              onClick={() => {
                setGenerateError(null);
                generateMutation.mutate();
              }}
              disabled={isGenerating}
              style={{ width: "100%" }}
            >
              {isGenerating ? "GENEREREN..." : "GENEREER CONCEPT"}
            </button>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "var(--vat-mid-grey)",
                fontFamily: "var(--font-body), sans-serif",
              }}
            >
              Jaarrekening kan alleen door je advisor gegenereerd worden.
            </p>
          )}
        </div>
      )}

      {/* Draft/reviewed state: downloads + regenerate */}
      {account && account.status !== "final" && (
        <div style={{ padding: "16px 0" }}>
          <DownloadButtons
            fiscalYear={fiscalYear}
            hasNlPdf={!!account.pdf_nl_path}
            hasEnPdf={!!account.pdf_en_path}
          />
          {isAdvisor && (
            <>
              <div style={{ height: 16 }} />
              <button
                className="action-button-secondary"
                onClick={() => {
                  setGenerateError(null);
                  generateMutation.mutate();
                }}
                disabled={isGenerating}
                style={{ width: "100%", opacity: 0.6 }}
              >
                {isGenerating ? "OPNIEUW GENEREREN..." : "OPNIEUW GENEREREN"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Final state: download only */}
      {account && account.status === "final" && (
        <div style={{ padding: "16px 0" }}>
          <DownloadButtons
            fiscalYear={fiscalYear}
            hasNlPdf={!!account.pdf_nl_path}
            hasEnPdf={!!account.pdf_en_path}
          />
          {account.reviewed_by && (
            <p
              style={{
                fontSize: 11,
                color: "var(--vat-mid-grey)",
                marginTop: 12,
              }}
            >
              Beoordeeld door {account.reviewed_by}
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {generateError && (
        <p
          style={{
            fontSize: 11,
            color: "var(--color-reserved)",
            marginTop: 12,
          }}
        >
          {generateError}
        </p>
      )}
    </div>
  );
}
