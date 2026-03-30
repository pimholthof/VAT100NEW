"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQuoteStore } from "@/lib/store/quote";
import {
  getQuote,
  updateQuoteStatus,
  generateQuoteShareToken,
  convertQuoteToInvoice,
  duplicateQuote,
  deleteQuote,
} from "@/features/quotes/actions";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";
import type { QuoteStatus, VatRate } from "@/lib/types";
import { ButtonPrimary, ButtonSecondary, ErrorMessage, ConfirmDialog } from "@/components/ui";

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  sent: "Verstuurd",
  accepted: "Geaccepteerd",
  invoiced: "Gefactureerd",
  rejected: "Afgewezen",
};

export default function EditQuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadQuote = useQuoteStore((s) => s.loadQuote);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [localShareToken, setLocalShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["quote", params.id],
    queryFn: () => getQuote(params.id),
  });

  const serverShareToken = result?.data?.share_token ?? null;

  useEffect(() => {
    if (result?.data) {
      const q = result.data;
      loadQuote({
        clientId: q.client_id,
        quoteNumber: q.quote_number,
        issueDate: q.issue_date,
        validUntil: q.valid_until ?? "",
        vatRate: q.vat_rate as VatRate,
        notes: q.notes ?? "",
        lines: q.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.rate,
        })),
      });
    }
  }, [result?.data, loadQuote]);

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    setStatusUpdating(true);
    setStatusMsg(null);
    const res = await updateQuoteStatus(params.id, newStatus);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg(`Status gewijzigd naar ${STATUS_LABELS[newStatus]}.`);
      queryClient.invalidateQueries({ queryKey: ["quote", params.id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    }
    setStatusUpdating(false);
  };

  const handleConvert = async () => {
    setConverting(true);
    setStatusMsg(null);
    const res = await convertQuoteToInvoice(params.id);
    if (res.error) {
      setStatusMsg(res.error);
    } else if (res.data) {
      setStatusMsg("Offerte omgezet naar factuur!");
      queryClient.invalidateQueries({ queryKey: ["quote", params.id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      router.push(`/dashboard/invoices/${res.data}`);
    }
    setConverting(false);
  };

  const shareToken = localShareToken ?? serverShareToken;

  const handleGenerateShareLink = async () => {
    setShareLoading(true);
    const res = await generateQuoteShareToken(params.id);
    if (res.error) {
      setStatusMsg(res.error);
    } else if (res.data) {
      setLocalShareToken(res.data);
    }
    setShareLoading(false);
  };

  const handleCopyShareLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/quote/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div style={{ padding: "64px 0" }}>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 32 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ width: 80, height: 9, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "100%", height: 36 }} />
          </div>
        ))}
      </div>
    );
  }

  if (result?.error) {
    return <ErrorMessage>Fout: {result.error}</ErrorMessage>;
  }

  const currentStatus = result?.data?.status;

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 0.9,
          margin: "0 0 32px",
        }}
      >
        Offerte{" "}
        <span style={{ fontSize: "var(--text-display-md)" }}>
          {result?.data?.quote_number}
        </span>
      </h1>

      {/* Status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
          padding: "16px 0",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: "var(--text-label)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {STATUS_LABELS[currentStatus ?? ""] ?? currentStatus}
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {currentStatus === "draft" && (
            <ButtonPrimary onClick={() => handleStatusChange("sent")} disabled={statusUpdating}>
              Markeer als verstuurd
            </ButtonPrimary>
          )}
          {currentStatus === "sent" && (
            <>
              <ButtonPrimary onClick={() => handleStatusChange("accepted")} disabled={statusUpdating}>
                Markeer als geaccepteerd
              </ButtonPrimary>
              <ButtonSecondary onClick={() => handleStatusChange("rejected")} disabled={statusUpdating}>
                Markeer als afgewezen
              </ButtonSecondary>
            </>
          )}
          {currentStatus === "accepted" && (
            <ButtonPrimary onClick={handleConvert} disabled={converting}>
              {converting ? "Omzetten..." : "Omzetten naar factuur"}
            </ButtonPrimary>
          )}
          {(currentStatus === "rejected" || currentStatus === "accepted") && (
            <ButtonSecondary onClick={() => handleStatusChange("draft")} disabled={statusUpdating}>
              Terug naar concept
            </ButtonSecondary>
          )}
        </div>
      </div>

      {statusMsg && <ErrorMessage style={{ marginBottom: 24 }}>{statusMsg}</ErrorMessage>}

      {/* Share link */}
      <div style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", padding: "16px 0", marginBottom: 8 }}>
        <div style={{ fontSize: "var(--text-label)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, opacity: 0.4 }}>
          Deel link
        </div>
        {shareToken ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "var(--text-mono-md)", fontWeight: 300, opacity: 0.6, wordBreak: "break-all", flex: 1 }}>
              {typeof window !== "undefined" ? `${window.location.origin}/quote/${shareToken}` : `/quote/${shareToken}`}
            </span>
            <ButtonSecondary onClick={handleCopyShareLink}>
              {copied ? "Gekopieerd" : "Kopieer"}
            </ButtonSecondary>
          </div>
        ) : (
          <ButtonSecondary onClick={handleGenerateShareLink} disabled={shareLoading}>
            {shareLoading ? "Genereren..." : "Genereer deellink"}
          </ButtonSecondary>
        )}
      </div>

      {/* PDF link + dupliceer */}
      <div style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", padding: "16px 0", marginBottom: 24, display: "flex", gap: 16 }}>
        <a
          href={`/api/quote/${params.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="table-action"
        >
          Bekijk PDF
        </a>
        <ButtonSecondary
          onClick={async () => {
            setDuplicating(true);
            const res = await duplicateQuote(params.id);
            if (res.error) {
              setStatusMsg(res.error);
            } else if (res.data) {
              router.push(`/dashboard/quotes/${res.data}`);
            }
            setDuplicating(false);
          }}
          disabled={duplicating}
        >
          {duplicating ? "Dupliceren..." : "Dupliceer offerte"}
        </ButtonSecondary>
        {currentStatus === "draft" && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.3,
              padding: "14px 0",
              color: "var(--color-accent)",
            }}
          >
            {deleting ? "Verwijderen..." : "Verwijder"}
          </button>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <QuoteForm quoteId={params.id} />
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Offerte verwijderen"
        message="Weet je zeker dat je deze offerte wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          setDeleting(true);
          const res = await deleteQuote(params.id);
          if (res.error) {
            setStatusMsg(res.error);
            setDeleting(false);
          } else {
            router.push("/dashboard/quotes");
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
