"use client";

import { useLocale } from "@/lib/i18n/context";
import { playSound } from "@/lib/utils/sound";
import { useInvoiceStore } from "@/lib/store/invoice";
import { Spinner } from "@/components/ui/Button";

export function InvoiceFormActions({
  saving,
  onSaveDraft,
  onIssueAndPreview,
  recipientName,
}: {
  saving: boolean;
  onSaveDraft: () => void;
  onIssueAndPreview: () => void;
  recipientName?: string | null;
}) {
  const { t } = useLocale();
  const isDirty = useInvoiceStore((s) => s.isDirty);
  const lastSavedAt = useInvoiceStore((s) => s.lastSavedAt);

  const savedLabel = lastSavedAt
    ? `Opgeslagen ${new Date(lastSavedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div>
      {/* Auto-save indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
          fontSize: "var(--text-body-xs)",
          opacity: 0.3,
          letterSpacing: "0.02em",
        }}
      >
        {saving ? (
          <span>Opslaan...</span>
        ) : isDirty ? (
          <span>Niet-opgeslagen wijzigingen</span>
        ) : savedLabel ? (
          <span>{savedLabel}</span>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <button
          type="button"
          onClick={() => {
            onSaveDraft();
            playSound("glass-ping");
          }}
          disabled={saving}
          aria-busy={saving || undefined}
          aria-disabled={saving || undefined}
          style={{
            flex: 1,
            minWidth: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "24px",
            background: "rgba(0,0,0,0.03)",
            border: "var(--border-rule)",
            fontSize: 12,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving && <Spinner size={12} />}
          <span>{t.invoices.saveDraft}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onIssueAndPreview();
            playSound("glass-ping");
          }}
          disabled={saving}
          aria-busy={saving || undefined}
          aria-disabled={saving || undefined}
          style={{
            flex: 2,
            minWidth: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "24px",
            background: "var(--foreground)",
            color: "var(--background)",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            cursor: saving ? "wait" : "pointer",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
          }}
        >
          {saving && <Spinner size={12} />}
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {recipientName
              ? `Versturen aan ${recipientName}`
              : t.invoices.issueAndPreview}
          </span>
        </button>
      </div>
    </div>
  );
}
